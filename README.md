Text file import
=======

A small library use to import text data (ascii) from disk or over ftp in a directory with filter functionality

## Installation

  npm install git+ssh://git@github.com/mickelindahl/grassy_text_file_import.git

## Usage
```js
let ftp = new Adapter( {
    credentials: {
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASS,
    },
    type: 'ftp'
} )

ftp.list( 'a directory' )
    .filter( { type: 'include', files: ['a file to include'] } )
    .read( 'binary' )
    .parse(parse.crews)
    .then( data=>[

           //do something with data    
        
    ] );
```

## API

## Functions

<dl>
<dt><a href="#ftpList">ftpList()</a> ⇒ <code>promise</code></dt>
<dd><p>List files in directory over ftp</p>
<ul>
<li><code>directory</code> Directory to list files in</li>
<li><code>credentials</code> ftp credentials<ul>
<li><code>host</code> host address</li>
<li><code>port</code> host port to connect to</li>
<li><code>user</code> user to login with</li>
<li><code>password</code> password to login with</li>
</ul>
</li>
<li><code>resolve</code> promise resolve handler</li>
</ul>
</dd>
<dt><a href="#ftpRead">ftpRead()</a> ⇒ <code>promise</code></dt>
<dd><p>Read files over ftp</p>
<ul>
<li><code>files</code> List with files paths to read</li>
<li><code>encoding</code> Type of encoding to read files with</li>
<li><code>credentials</code> ftp credentials<ul>
<li><code>host</code> host address</li>
<li><code>port</code> host port to connect to</li>
<li><code>user</code> user to login with</li>
<li><code>password</code> password to login with</li>
</ul>
</li>
<li><code>resolve</code> promise resolve handler</li>
</ul>
</dd>
</dl>

## Tests

  Lab.cmd

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release

