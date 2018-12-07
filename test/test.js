const assert = require('assert');
const t = require('../index');

describe('retrieveData', function () {
  it('retrieves data', async function () {
    const userLogins = ['twitchpresents', 'patterrz'];
    return t.retrieveData(userLogins).then(data => {
      assert.ok(data);
      console.log(JSON.stringify(data));
    })
  })
});

describe('TwitchStreams', function () {
  it('#generateSignal(data)', function () {
    const data = require('./test-data.json');
    const app = buildApp();
    const signal = app.generateSignal(data);
    assert.ok(signal);
    assert.equal(signal.name, 'Patterrz is live!');
    assert(signal.message.includes('Pokemon Lets Go FINALLY FIND SHINY VULPIX'));
    assert(signal.message.includes('https://www.twitch.tv/Patterrz'));
  });

  it('#generateSignal(data) doesn\'t repeat', function () {
    const data = require('./test-data.json');
    const app = buildApp();

    let signal = app.generateSignal(data);
    assert.ok(signal);
    assert.equal(signal.name, 'Patterrz is live!');

    signal = app.generateSignal(data);
    assert.ok(signal);
    assert.equal(signal.name, 'TwitchPresents is live!');

    signal = app.generateSignal(data);
    assert.ok(!signal);
  });

  describe('#applyConfig()', function () {
    it('rejects empty logins', function () {
      const app = buildApp({
        userLogins: ['']
      });
      app.applyConfig().then(() => {
        assert.fail("Should have rejected.");
      }).catch(error => {
        assert.ok(error);
      })
    })  
  });

  it('#run()', function () {
    const app = buildApp();

    console.log(JSON.stringify(app.config));
    return app.run().then(signal => {
      assert.ok(signal);
    });
  });

  it('gracefully handles bad config', async function () {
    const app = buildApp({});
    return app.run().then(async () => {
      return app.run().then(signal => {
        console.log('I\'m good');
      });
    })
  });
});

function buildApp(config) {
  const app = new t.TwitchStreams();
  app.config = config || {
    userLogins: ['twitchpresents', 'patterrz'],
    geometry: {
      width: 1,
      height: 1,
    }
  };

  return app;
}