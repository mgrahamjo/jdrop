# jdrop

Seems like everyone who's written a Node app has also written a JSON file storage module. I guess I'm no exception. Here's my rationale for publishing jdrop:

* It supports updating only a portion of a JSON file without overwriting changes a concurrent user may have made in another portion of the file.
* Escapes HTML
* Uses promises instead of callbacks
* You can choose an error handling option:
** Catch a rejected promise
** Let jdrop autocatch errors
** Provide your own autocatch handler

# Usage

```javascript
const jdrop = require('jdrop')({
		path: 'data',
		autocatch: true
	});

let data = {
	post: {
		body: 'hello'
	}
};

// save data
jdrop.put('posts', data).then(posts => {
	// stuff here runs after data is saved
});

// update part of a file
jdrop.put('posts', 'HI!', 'post.body').then(posts => {
	// stuff here runs after data is saved
});

// get data
jdrop.get('items').then(items => {
	// do stuff with items...
});

// delete part of a file
jdrop.del('items', 'key.example[3].item').then(items => {
	// stuff here runs after the file is altered
});

// delete a file
jdrop.del('items').then(() => {
	// stuff here runs after the file is deleted
});
```

### Settings

When you `require` jdrop, there are two optional settings.

`path` is the directory in which to store JSON files. All of the keys you use to access files will be relative to this path. The default path is `data`.

`autocatch` controlls error handling behavior. The default behavior uses a promise rejection, which you can handle thusly:

```javascript
jdrop.get('items').then(items => {
	// do stuff...
}).catch(err => {
	console.error(err);
});
```

If you set `autocatch` to `true`, jdrop will no longer reject promises. Instead, it will log the error and end the process with exit code 1.

Alternatively, you can supply a function to the `autocatch` setting. This function will be passed any error objects that arise. You can use this to send an error to the client without crashing.
