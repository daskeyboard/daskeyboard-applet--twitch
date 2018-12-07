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
    logger.error(`Got error: ${error}`);
    throw error;
  });
}


class TwitchStreams extends q.DesktopApp {
  constructor() {
    super();
    // store a record of previously notified deals
    this.notified = {};
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
              new q.Point('#00FF00')
            ]
          ],
          name: `${stream.user_name} is live!`,
          message: `${stream.title}\nhttps://www.twitch.tv/${stream.user_name}`,
        });
      }
    }

    return null;
  }


  async run() {
    logger.info("Running.");
    const userLogins = this.config.userLogins;

    if (userLogins) {
      logger.info("My user logins are: " + JSON.stringify(userLogins));

      return retrieveData(userLogins)
        .then(body => {
          return this.generateSignal(body);
        })
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