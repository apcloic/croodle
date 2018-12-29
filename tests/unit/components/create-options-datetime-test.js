import { run } from '@ember/runloop';
import { moduleForComponent, test } from 'ember-qunit';
import moment from 'moment';

moduleForComponent('create-options-datetime', 'Unit | Component | create options datetime', {
  unit: true,
  needs: [
    'config:environment',
    'model:option', 'model:poll', 'model:user',
    'service:i18n',
    'validator:alias', 'validator:collection', 'validator:iso8601', 'validator:length', 'validator:presence', 'validator:time', 'validator:unique', 'validator:valid-collection'
  ],
  beforeEach() {
    this.inject.service('store');
  }
});

test('delete a date', function(assert) {
  let component = this.subject();
  let a, b, c, d, e;
  run(() => {
    a = this.store.createFragment('option', { title: moment('2015-01-01T01:01:00.000').toISOString() });
    b = this.store.createFragment('option', { title: moment('2015-01-01T11:11:00.000').toISOString() });
    c = this.store.createFragment('option', { title: moment('2015-02-02T11:11:00.000').toISOString() });
    d = this.store.createFragment('option', { title: '2015-02-02' });
    e = this.store.createFragment('option', { title: '2015-02-03' });
    component.set('dates', [a, b, c, d, e]);
  });
  component.send('deleteOption', b);
  assert.deepEqual(
    component.get('dates').map((date) => date.get('title')),
    [
      moment('2015-01-01T01:01:00.000').toISOString(),
      moment('2015-02-02T11:11:00.000').toISOString(),
      '2015-02-02',
      '2015-02-03'
    ],
    'date get deleted if there is another date with same day (both having a time)'
  );
  component.send('deleteOption', d);
  assert.deepEqual(
    component.get('dates').map((date) => date.get('title')),
    [
      moment('2015-01-01T01:01:00.000').toISOString(),
      moment('2015-02-02T11:11:00.000').toISOString(),
      '2015-02-03'
    ],
    'date get deleted if there is another date with same day (date does not have a time)'
  );
  run(() => {
    component.send('deleteOption', c);
  });
  assert.deepEqual(
    component.get('dates').map((date) => date.get('title')),
    [
      moment('2015-01-01T01:01:00.000').toISOString(),
      '2015-02-02',
      '2015-02-03'
    ],
    'time is removed from date if there isn\' t any other date with same day'
  );
  component.send('deleteOption', d);
  assert.deepEqual(
    component.get('dates').map((date) => date.get('title')),
    [
      moment('2015-01-01T01:01:00.000').toISOString(),
      '2015-02-02',
      '2015-02-03'
    ],
    'nothing changes if it\'s the only date for this day it it doesn\'t have a time'
  );
});

test('datetimes are grouped by date', function(assert) {
  let component = this.subject();
  let a, b, c;
  // have to set dates in local time and than convert to ISO 8601 strings
  // because otherwise test could fail caused by timezone
  run(() => {
    a = this.store.createFragment('option', { title: moment('2015-01-01T01:01:00').toISOString() });
    b = this.store.createFragment('option', { title: moment('2015-01-01T11:11:00').toISOString() });
    c = this.store.createFragment('option', { title: moment('2015-02-02T01:01:00').toISOString() });
    component.set('dates', [a, b, c]);
  });
  assert.equal(
    component.get('groupedDates.length'),
    2,
    'length is correct'
  );
  assert.deepEqual(
    component.get('groupedDates.firstObject').map((item) => {
      return item.get('date').toISOString();
    }),
    [a.get('title'), b.get('title')],
    'first dates having same day are grouped together'
  );
  assert.equal(
    component.get('groupedDates.lastObject.firstObject.date').toISOString(),
    [c.get('title')],
    'last date having another day is in a separate group'
  );
});

test('bindings are working on grouped datetimes', function(assert) {
  let component = this.subject();
  run(() => {
    component.set('dates', [
      this.store.createFragment('option', {
        title: moment('2015-01-01T11:11:00.000Z').toISOString()
      })
    ]);
  });
  assert.equal(
    component.get('groupedDates.firstObject.firstObject.time'),
    moment('2015-01-01T11:11:00.000Z').format('HH:mm'),
    'time is correct before'
  );
  run(() => {
    component.set(
      'groupedDates.firstObject.firstObject.time',
      '00:00'
    );
  });
  assert.equal(
    component.get('dates.firstObject.title'),
    moment('2015-01-01T00:00').toISOString(),
    'option is updated after time changed on grouped datetimes'
  );
  run(() => {
    component.get('dates').pushObject(
      this.store.createFragment('option', { title: moment('2015-01-01T12:12').toISOString() })
    );
  });
  assert.equal(
    component.get('groupedDates.firstObject.length'),
    2,
    'grouped datetimes got updated after option was added (same day)'
  );
  assert.equal(
    component.get('groupedDates.firstObject.lastObject.time'),
    '12:12',
    'grouped datetimes got updated correctly after option was added (same day)'
  );
  run(() => {
    component.get('dates').pushObject(
      this.store.createFragment('option', { title: moment('2015-02-02T01:01').toISOString() })
    );
  });
  assert.equal(
    component.get('groupedDates.length'),
    2,
    'grouped datetimes got updated after option was added (other day)'
  );
  assert.equal(
    component.get('groupedDates.lastObject.firstObject.time'),
    '01:01',
    'grouped datetimes got updated correctly after option was added (same day)'
  );
});

test('adopt times of first day - simple', function(assert) {
  let component;
  let poll;
  run(() => {
    poll = this.store.createRecord('poll', {
      options: [
        { title: moment('2015-01-01T11:11:00.000').toISOString() },
        { title: moment('2015-01-01T22:22:00.000').toISOString() },
        { title: moment('2015-01-02').toISOString() },
        { title: moment('2015-01-03').toISOString() }
      ]
    });
    component = this.subject({
      dates: poll.get('options')
    });
    component.send('adoptTimesOfFirstDay');
  });
  assert.deepEqual(
    component.get('dates').map((option) => option.get('title')),
    [
      moment('2015-01-01T11:11:00.000').toISOString(),
      moment('2015-01-01T22:22:00.000').toISOString(),
      moment('2015-01-02T11:11:00.000').toISOString(),
      moment('2015-01-02T22:22:00.000').toISOString(),
      moment('2015-01-03T11:11:00.000').toISOString(),
      moment('2015-01-03T22:22:00.000').toISOString()
    ],
    'times adopted correctly'
  );
});

test('adopt times of first day - having times on the other days', function(assert) {
  let component;
  let poll;
  run(() => {
    poll = this.store.createRecord('poll', {
      options: [
        { title: moment('2015-01-01T11:11:00.000').toISOString() },
        { title: moment('2015-01-01T22:22:00.000').toISOString() },
        { title: moment('2015-01-02T09:11:00.000').toISOString() },
        { title: moment('2015-01-03T01:11:00.000').toISOString() },
        { title: moment('2015-01-03T11:11:00.000').toISOString() },
        { title: moment('2015-01-04T02:11:00.000').toISOString() },
        { title: moment('2015-01-04T05:11:00.000').toISOString() },
        { title: moment('2015-01-04T12:11:00.000').toISOString() }
      ]
    });
    component = this.subject({
      dates: poll.get('options')
    });
    component.send('adoptTimesOfFirstDay');
  });
  assert.deepEqual(
    component.get('dates').map((option) => option.get('title')),
    [
      moment('2015-01-01T11:11:00.000').toISOString(),
      moment('2015-01-01T22:22:00.000').toISOString(),
      moment('2015-01-02T11:11:00.000').toISOString(),
      moment('2015-01-02T22:22:00.000').toISOString(),
      moment('2015-01-03T11:11:00.000').toISOString(),
      moment('2015-01-03T22:22:00.000').toISOString(),
      moment('2015-01-04T11:11:00.000').toISOString(),
      moment('2015-01-04T22:22:00.000').toISOString()
    ],
    'times adopted correctly'
  );
});

test('adopt times of first day - no times on first day', function(assert) {
  let component;
  let poll;
  run(() => {
    poll = this.store.createRecord('poll', {
      options: [
        { title: '2015-01-01' },
        { title: '2015-01-02' },
        { title: moment('2015-01-03T11:00:00.000Z').toISOString() },
        { title: moment('2015-01-03T15:00:00.000Z').toISOString() }
      ]
    });
    component = this.subject({
      dates: poll.get('options')
    });
    component.send('adoptTimesOfFirstDay');
  });
  assert.deepEqual(
    component.get('dates').map((option) => option.get('title')),
    [
      '2015-01-01',
      '2015-01-02',
      '2015-01-03'
    ],
    'times are removed from all days'
  );
});
