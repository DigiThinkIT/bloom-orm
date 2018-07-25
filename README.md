# Bloom ORM

A thin data model framework for BloomUI.

This library encapsulates custom CRUD models into reusable interfaces for the BloomUI to use in its components.
The idea is not to automate data quering or graphing. Instead models are created by hand by a real developer to take advantage of whatever backend datastore is required to get the job done. All models then expose six common methods to read, create, update or delete its data, wether the data is one or multiple tables on a mysql database or rest api is up to the developer implementing the model.

## Model Common Methods

- connect: Gives the model a chance to connect to their store.
- disconnect: Lets a model disconnect from their store.
- create: Creates records im bulk.
- fetch: Fetch records in bulk.
- update: Update records in bulk.
- delete: Delete records by id in bulk.

## Async Events

Although models inherit EventDispatcher the event object passed provides a way to pause model method calls until long running event processes can take place:

```javascript
myModel.on('beforeConnect', (e) => {
    e.await(myLongRunningProcessBeforeConnect);
});

myModel.on('afterConnect', (e) => {
    e.await(myLongRunningProcessAfterConnect);
})

myModel.fetch(r => r.$id < 100);
```
Here the fetch call will pause until eventually both event promises resolve.


## Promises

All crud api calls return promises

```javascript
model.fetch(r => r.$id < 100)
    .then(result => result.rows.reduce((a, c) => a.concat(c[model.primaryKey]), [])
    .then(ids => model.delete(ids));
```

As well as being async capable(experimental)

```javascript
let results = await model.fetch(r => r.$id < 100);
await model.delete(result.rows.reduce(a, c) => a.concat(c[model.primaryKey]), []);

```

