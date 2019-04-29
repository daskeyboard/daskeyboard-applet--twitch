const request = require('request-promise');
const q = require('daskeyboard-applet');
const logger = q.logger;

/**
 * Retrieve data from the service
 */
async function retrieveData(userLogins) {
  let url = 'https://api.twitch.tv/helix/streams?';
  logger.info("Getting data via URL: " + url);
  return request.get({
    url: url,
    headers: {
      'Client-ID': 'fs7tnn3kkjowzye49l4xxex49oy539',
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
    const userLogins = this.config.userLogins;

    if (userLogins) {
      logger.info("My user logins are: " + JSON.stringify(userLogins));

      return retrieveData(userLogins)
        .then(body => {
          return this.generateSignal(body);
        }).catch(error => {
          logger.error(`Error while getting Twitch data: ${error}`);
          if(`${error.message}`.includes("getaddrinfo")){
            return q.Signal.error(
              'The Twitch service returned an error. <b>Please check your internet connection</b>.'
            );
          }
          return q.Signal.error([`The Twitch service returned an error. Detail: ${error}`]);
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