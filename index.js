const request = require('request-promise');
const q = require('daskeyboard-applet');
const logger = q.logger;
const TWITCH_API_STREAM_URL = 'https://api.twitch.tv/helix/streams';
const TWITCH_CLIENT_ID = 'qjp08cskr8p15hx23w6qy5ovkpienb';



class TwitchStreams extends q.DesktopApp {
  constructor() {
    super();
    // store a record of previously notified deals
    this.notified = {};
    // run every 5 min
    this.pollingInterval = 5 * 60 * 1000;
  }

  /**
   * Retrieve data from the service
   */
  async retrieveData(userLogins) {
    logger.info(`Retrive data for user logins ${JSON.stringify(userLogins)}`);
    const url = TWITCH_API_STREAM_URL + `?user_login${userLogins}`;
    let options = {
      uri: url,
      json: true
    };
    return this.getTwitchAccessToken().then(accessToken => {
      logger.info(`Got token ${accessToken}`);
      // save the token
      this.twitchAccessToken = accessToken;
      // add toekn to request option
      options = {
        ...options, headers: {
          'Authorization': `Bearer ${accessToken}`,
          'client-id': TWITCH_CLIENT_ID
        }
      };
      return request(options);
    })
      .catch(err => {
        logger.info(`Got error ${err}, will trying to get access token`);
        return this.refreshTwitchAccessToken().then(accessToken => {
          // save the token
          this.twitchAccessToken = accessToken;
          // add toekn to request option
          options = {
            ...options, headers: {
              'Authorization': `Bearer ${accessToken}`,
              'client-id': TWITCH_CLIENT_ID
            }
          };
          return request(options);
        });
      })
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
              new q.Point('#0000FF', q.Effects.BLINK)
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
    const userLogins = this.config.userLogins;

    if (userLogins) {
      logger.info("My user logins are: " + JSON.stringify(userLogins));

      return this.retrieveData(userLogins)
        .then(body => {
          return this.generateSignal(body);
        }).catch(error => {
          logger.error(`Error while getting Twitch data: ${error}`);
          if (`${error.message}`.includes("getaddrinfo")) {
            // Do not send signal when getting internet connection error
            // return q.Signal.error(
            //   'The Twitch service returned an error. <b>Please check your internet connection</b>.'
            // );
          } else {
            return q.Signal.error([`The Twitch service returned an error. Detail: ${error}`]);
          }
        });
    } else {
      logger.warn("No userLogins configured.");
      return null;
    }
  }

  /**
   * Use the daskeyboard Oauth Proxy to get an access token from Twitch for this user
   */
  async getTwitchAccessToken() {
    // return if found in memory
    if (this.twitchAccessToken) {
      return this.twitchAccessToken;
    }

    if (!this.authorization.apiKey) {
      throw new Error('No apiKey available');
    }

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: this.authorization.apiKey
    });

    return proxyRequest.getOauth2ProxyToken().then(proxyResponse => {
      return proxyResponse.access_token;
    });
  }

  /**
   * Use the daskeyboard Oauth proxy to refresh twitch access token
   */
  async refreshTwitchAccessToken() {
    if (!this.authorization.apiKey) {
      throw new Error('No apiKey available');
    }

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: this.authorization.apiKey
    });

    return proxyRequest.refreshOauth2AccessToken().then(proxyResponse => {
      return proxyResponse.access_token;
    });
  }
}


module.exports = {
  TwitchStreams: TwitchStreams
}

const applet = new TwitchStreams();