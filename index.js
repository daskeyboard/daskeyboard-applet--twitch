const request = require('request-promise');
const q = require('daskeyboard-applet');
const logger = q.logger;

/**
 * Retrieve data from the service
 */
async function retrieveData(userLogins, clientID, oAuth) {
  let url = 'https://api.twitch.tv/helix/streams?';
  logger.info("Getting data via URL: " + url);
  return request.get({
    url: url,
    headers: {
      'Client-ID': 'fs7tnn3kkjowzye49l4xxex49oy539',
      'Authorization': 'Bearer ' + oAuth
    },
    qs: {
      user_login: userLogins,
    },
    json: true
  }).catch(error => {
    logger.error(`Error when trying to retrieveData: ${error}`);
    throw new Error(`Error when trying to retrieveData: ${error}`);
  });
}

async function requestOAuthToken(clientID, secret) {
  let url = 'https://id.twitch.tv/oauth2/token?client_id=' + clientID + "&client_secret=" + secret + "&grant_type=client_credentials";
  return request.post({
    url: url,
    method: "POST",
    json: true
  }).catch(error => {
    logger.error('Error when trying to requestOAuthToken: ' + error);
    throw new Error('Error when trying to requestOAuthToken: ' + error); 
  });
}


class TwitchStreams extends q.DesktopApp {
  constructor() {
    super();
    // store a record of previously notified deals
    this.notified = {};
    // run every 5 min
    this.pollingInterval = 5 * 60 * 1000;
  }

  async applyConfig() {
    const userLogins = this.config.userLogins;

    if (userLogins) {
      logger.info("My user logins are: " + JSON.stringify(userLogins));

      for (let login of userLogins) {
        if (null == login || login.trim() == '') {
          throw new Error("User logins must not be empty.")
        }
      }
    }
    const clientID = this.config.clientID;
    const secret = this.config.secret;
    if(clientID === null || clientID === '') {
       throw new Error("Client ID must not be empty.")
    }
    if(secret === null || secret === '') {
       throw new Error('Twitch API Secret must not be empty.')
    }
  }

  /**
   * Generate a signal from deal RSS
   * @param {Array<RssItem>} data
   */
  generateSignal(data) {
    for (let stream of data.data) {
      if (stream.type === 'live' && !this.notified[stream.id]) {
        this.notified[stream.id] = true;
        return new q.Signal({
          points: [
            [
              new q.Point('#0000FF',q.Effects.BLINK)
            ]
          ],
          name: `${stream.user_name} is live!`,
          message: `${stream.title}`,
          link: {
            url: 'https://www.twitch.tv/' + `${stream.user_name}`,
            label: 'Show in Twitch',
          },
        });
      }
    }

    return null;
  }


  async run() {
    logger.info("Twitch running.");
    const clientID = this.config.clientID;
    const secret = this.config.secret;
    if(clientID === undefined || clientID === '') {
	logger.warn("No ClientID configured!");
    	return null;
    }
    if(secret === undefined || secret === '') {
	logger.warn("No API Secret configured!");
    	return null;
    }
    var oAuth = this.oAuth;

    if(oAuth == null || oAuth.trim() == '' || this.tokenExpiresAt < Date.now()+10000){
       logger.info("Acquiring new OAuth Token");
       var data = await requestOAuthToken(clientID, secret);
       this.oAuth = data["access_token"];
       oAuth = this.oAuth;
       this.tokenExpiresAt = Date.now() + (data["expires_in"]*1000);
    }

    const userLogins = this.config.userLogins;

    if (userLogins) {
      logger.info("My user logins are: " + JSON.stringify(userLogins));
      return retrieveData(userLogins, clientID, oAuth)
        .then(body => {
	  return this.generateSignal(body);
        }).catch(error => {
          logger.error(`Error while getting Twitch data: ${error}`);
          if(`${error.message}`.includes("getaddrinfo")){
            // Do not send signal when getting internet connection error
            // return q.Signal.error(
            //   'The Twitch service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([`The Twitch service returned an error. Detail: ${error}`]);
          }
        });
    } else {
      logger.warn("No userLogins configured.");
      return null;
    }
  }
}


module.exports = {
  TwitchStreams: TwitchStreams,
  retrieveData: retrieveData,
}

const applet = new TwitchStreams();
