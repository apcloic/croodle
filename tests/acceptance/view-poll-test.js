import { test } from 'qunit';
import moduleForAcceptance from 'croodle/tests/helpers/module-for-acceptance';
import pageParticipation from 'croodle/tests/pages/poll/participation';
import pageEvaluation from 'croodle/tests/pages/poll/evaluation';
import moment from 'moment';
/* jshint proto: true */

moduleForAcceptance('Acceptance | view poll', {
  beforeEach() {
    window.localStorage.setItem('locale', 'en');
    moment.locale('en');
  }
});

test('poll url', function(assert) {
  let encryptionKey = 'abcdefghijklmnopqrstuvwxyz012345789';
  let poll = server.create('poll', { encryptionKey });
  let pollUrl = `/poll/${poll.id}?encryptionKey=${encryptionKey}`;

  visit(pollUrl);
  andThen(function() {
    assert.equal(
      pageParticipation.url,
      window.location.href,
      'share link is shown'
    );

    pageParticipation.copyUrl();
    /*
     * Can't test if link is actually copied to clipboard due to api
     * restrictions. Due to security it's not allowed to read from clipboard.
     *
     * Can't test if flash message is shown due to
     * https://github.com/poteto/ember-cli-flash/issues/202
    */
  });
});

test('shows a warning if poll is about to be expired', function(assert) {
  let encryptionKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let poll = server.create('poll', {
    encryptionKey,
    expirationDate: moment().add(1, 'week')
  });
  visit(`/poll/${poll.id}?encryptionKey=${encryptionKey}`).then(function() {
    assert.ok(
      pageParticipation.showsExpirationWarning
    );
  });
});

test('view a poll with dates', function(assert) {
  let encryptionKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let poll = server.create('poll', {
    encryptionKey,
    options: [
      { title: '2015-12-12' },
      { title: '2016-01-01' }
    ]
  });

  visit(`/poll/${poll.id}?encryptionKey=${encryptionKey}`).then(function() {
    assert.deepEqual(
      pageParticipation.options().labels,
      [
        'Saturday, December 12, 2015',
        'Friday, January 1, 2016'
      ]
    );
  });
});

test('view a poll with dates and times', function(assert) {
  let encryptionKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let timezone = moment.tz.guess();
  let poll = server.create('poll', {
    encryptionKey,
    expirationDate: moment().add(1, 'year'),
    isDateTime: true,
    options: [
      { title: '2015-12-12T11:11:00.000Z' },
      { title: '2015-12-12T13:13:00.000Z' },
      { title: '2016-01-01T11:11:00.000Z' }
    ],
    timezone
  });

  visit(`/poll/${poll.id}?encryptionKey=${encryptionKey}`).then(function() {
    assert.deepEqual(
      pageParticipation.options().labels,
      [
        // full date
        moment.tz('2015-12-12T11:11:00.000Z', timezone).locale('en').format('LLLL'),
        // only time cause day is repeated
        moment.tz('2015-12-12T13:13:00.000Z', timezone).locale('en').format('LT'),
        // full date cause day changed
        moment.tz('2016-01-01T11:11:00.000Z', timezone).locale('en').format('LLLL')
      ]
    );
    assert.notOk(
      pageParticipation.showsExpirationWarning,
      'does not show an expiration warning if poll will not expire in next weeks'
    );
  });
});

test('view a poll while timezone differs from the one poll got created in and choose local timezone', async function(assert) {
  let encryptionKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let timezoneUser = moment.tz.guess();
  let timezonePoll = timezoneUser !== 'America/Caracas' ? 'America/Caracas' : 'Europe/Moscow';
  let poll = server.create('poll', {
    encryptionKey,
    isDateTime: true,
    options: [
      { title: '2015-12-12T11:11:00.000Z' },
      { title: '2016-01-01T11:11:00.000Z' }
    ],
    timezone: timezonePoll,
    users: [
      server.create('user', {
        encryptionKey,
        selections: [
          {
            type: 'yes',
            labelTranslation: 'answerTypes.yes.label',
            icon: 'glyphicon glyphicon-thumbs-up',
            label: 'Yes'
          },
          {
            type: 'no',
            labelTranslation: 'answerTypes.no.label',
            icon: 'glyphicon glyphicon-thumbs-down',
            label: 'No'
          }
        ]
      })
    ]
  });

  await visit(`/poll/${poll.id}?encryptionKey=${encryptionKey}`);
  assert.ok(
    find('#modal-choose-timezone-modal').is(':visible'),
    'user gets asked which timezone should be used'
  );

  await click('#modal-choose-timezone-modal button.use-local-timezone');
  assert.deepEqual(
    pageParticipation.options().labels,
    [
      moment.tz('2015-12-12T11:11:00.000Z', timezoneUser).locale('en').format('LLLL'),
      moment.tz('2016-01-01T11:11:00.000Z', timezoneUser).locale('en').format('LLLL')
    ]
  );
  assert.notOk(
    find('#modal-choose-timezone-modal').is(':visible'),
    'modal is closed'
  );

  await switchTab('evaluation');
  assert.deepEqual(
    pageEvaluation.preferedOptions,
    [moment.tz('2015-12-12T11:11:00.000Z', timezoneUser).locale('en').format('LLLL')]
  );
});

test('view a poll while timezone differs from the one poll got created in and choose poll timezone', async function(assert) {
  let encryptionKey = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let timezoneUser = moment.tz.guess();
  let timezonePoll = timezoneUser !== 'America/Caracas' ? 'America/Caracas' : 'Europe/Moscow';
  let poll = server.create('poll', {
    encryptionKey,
    isDateTime: true,
    options: [
      { title: '2015-12-12T11:11:00.000Z' },
      { title: '2016-01-01T11:11:00.000Z' }
    ],
    timezone: timezonePoll,
    users: [
      server.create('user', {
        encryptionKey,
        selections: [
          {
            type: 'yes',
            labelTranslation: 'answerTypes.yes.label',
            icon: 'glyphicon glyphicon-thumbs-up',
            label: 'Yes'
          },
          {
            type: 'no',
            labelTranslation: 'answerTypes.no.label',
            icon: 'glyphicon glyphicon-thumbs-down',
            label: 'No'
          }
        ]
      })
    ]
  });

  await visit(`/poll/${poll.id}?encryptionKey=${encryptionKey}`);
  assert.ok(
    find('#modal-choose-timezone-modal').is(':visible'),
    'user gets asked which timezone should be used'
  );

  await click('#modal-choose-timezone-modal button.use-poll-timezone');
  assert.deepEqual(
    pageParticipation.options().labels,
    [
      moment.tz('2015-12-12T11:11:00.000Z', timezonePoll).locale('en').format('LLLL'),
      moment.tz('2016-01-01T11:11:00.000Z', timezonePoll).locale('en').format('LLLL')
    ]
  );

  assert.notOk(
    find('#modal-choose-timezone-modal').is(':visible'),
    'modal is closed'
  );

  await switchTab('evaluation');
  assert.deepEqual(
    pageEvaluation.preferedOptions,
    [moment.tz('2015-12-12T11:11:00.000Z', timezonePoll).locale('en').format('LLLL')]
  );
});
