/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

const Client = require( 'sftpjs' );
const Promise = require( 'bluebird' );
const parse = require( 'parse' );
const debug = require( 'debug' )( 'text_file_import:index.js' );
const fs = require( 'fs' );

class Adapter {

    constructor( options ) {

        // super(options, options);

        this.credentials = options.credentials;
        this.data = [];
        this.files;
        this.type = options.type;

        debug( this.credentials )
    }
}

Adapter.prototype.then = function ( resolve ) {

    this._promise = this._promise.then( resolve );
    return this
};

Adapter.prototype.catch = function ( reject ) {

    this._promise = this._promise.catch( reject );
    return this

};

Adapter.prototype.list = function ( directory ) {

    let self = this;

    this._promise = new Promise( resolve=> {

        if ( self.type == 'disk' ) {

            debug( 'list disk' );

            diskList( directory, resolve )

        } else if ( self.type == 'ftp' ) {

            debug( 'list ftp' );

            ftpList( directory, self.credentials, resolve )

        } else {

            console.error( 'Unsupported type', self.type )

        }

    } ).then((files)=>{

        // Handle to all files in the directory
        self.files=files;

        return files

    });

    return this
};

Adapter.prototype.filter = function ( filter ) {

    this._promise = this._promise.then( files=> {

        if ( !filter ) {
            return files
        }

        debug( 'filter', filter, files );

        let _files = [];

        files.forEach( f=> {

            if ( filter.type == 'include' ) {

                if ( filter.files.indexOf( f.name ) == -1 ) {
                    return
                }

                _files.push( f )

            } else if ( filter.type == 'exclude' ) {

                if ( filter.files.indexOf( f.name ) != -1 ) {
                    return
                }

                _files.push( f )

            }
        } );

        if ( _files.length == 0 ) {

            console.log( 'Warning no files to load', _files )

        }

        return _files;

    } );

    return this
};

Adapter.prototype.read = function ( encoding ) {

    let self = this;
    this._promise = this._promise.then( files=> {

        return new Promise( resolve=> {

            if ( self.type == 'disk' ) {

                debug( 'read disk' );
                diskRead( files, encoding, resolve )

            } else if ( self.type == 'ftp' ) {

                debug( 'read ftp' );
                ftpRead( files, encoding, self.credentials, resolve )

            } else {

                console.error( 'Unsupported type', self.type )

            }

        } ).then( data=> {

            data.forEach( d=> {

                self.data.push( d )

            } );

            // self.data=data;

        } );

    } );

    return this

};

Adapter.prototype.parse = function ( parse ) {

    let data = this.data;

    this._promise = this._promise.then( () => {

        debug( 'parse' );

        let promise = Promise.resolve()

        data.forEach( d=> {

            promise = new Promise( resolve=> {

                parse( d ).then( json=> {

                    d.json = json;

                    resolve()
                } )
            } );
        } );

        return promise

    } );

    return this

};


function diskList( directory, resolve ) {

    let files = [];

    let _files = fs.readdirSync( directory );


    debug( 'diskList', directory, _files )

    _files.forEach( file => {

        files.push( {
            path: directory + '/' + file,
            name: file,
            directory: directory,
        } )

    } );

    resolve( files );

}


function diskRead( files, encoding, resolve ) {

    debug( 'diskRead' )

    let data = [];

    files.forEach( f=> {

        let text = fs.readFileSync( f.path, encoding );
        data.push( {
            text: text,
            file: f.name
        } )

    } );

    resolve( data )
}

/**
 *  List files in directory over ftp
 *
 * - `directory` Directory to list files in
 * - `credentials` ftp credentials
 *   - `host` host address
 *   - `port` host port to connect to
 *   - `user` user to login with
 *   - `password` password to login with
 * - `resolve` promise resolve handler
 *   @returns {promise} list with files in directory
 */
function ftpList( directory, credentials, resolve ) {

    var c = Client();
    c.on( 'ready', function () {

        debug('ftpList', directory)

        c.list( directory, function ( err, list ) {
            if ( err ) throw err;

            debug('ftpList', list)

            let files = [];
            list.forEach( ( l )=> {

                files.push( {
                    path: directory + '/' + l.name,
                    name: l.name,
                    directory: directory,
                } )
            } );

            c.end();
            resolve( files )

        } );
    } ).connect( credentials );
}

/**
 *  Read files over ftp
 *
 * - `files` List with files paths to read
 * - `encoding` Type of encoding to read files with
 * - `credentials` ftp credentials
 *   - `host` host address
 *   - `port` host port to connect to
 *   - `user` user to login with
 *   - `password` password to login with
 * - `resolve` promise resolve handler
 *   @returns {promise} list with data from each file
 */
function ftpRead( files, encoding, credentials, resolve ) {


    let data = [];

    let counter = { open: 0, closed: 0 };

    var c = Client();
    c.on( 'ready', function () {

        let promise = Promise.resolve();

        files.forEach( f=> {

            promise = promise.then( ()=> {
                return new Promise( resolveInner=> {

                    debug( 'c.on ready', f.path );

                    c.get( f.path, function ( err, stream ) {
                        if ( err ) throw err;

                        counter.open++;
                        debug( 'c.get' );

                        let string = '';

                        stream.on( 'data', function ( buffer ) {

                            // debug( 'c.on data' );
                            string += buffer.toString( encoding );

                        } );

                        stream.on( 'close', function ( response ) {
                            counter.closed++;
                            debug( 'c.on close', counter );

                            // c.end();

                            data.push( {
                                text: string,
                                file: f.name
                            } );

                            resolveInner()

                        } );

                        stream.on( 'error', function ( response ) {


                            debug( 'cc.on error' );

                            // c.end();

                            data.push( {
                                text: string,
                                file: f.name
                            } );

                            resolveInner()

                        } );
                    } );
                } )
            } )

        } );

        promise.then( ()=> {

            c.end()

            debug( 'ftpRead done' )
            resolve( data )

        } );

    } ).connect( credentials );
}

module.exports = ( options )=> {
    return new Adapter( options )
};
