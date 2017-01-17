/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

const Client = require( 'sftpjs' );
const Promise = require( 'bluebird' );
const parse = require( 'parse' );
const debug = require( 'debug' )( 'ftpplus:index.js' );
const fs = require( 'fs' );

class Adapter {

    constructor( options ) {

        // super(options, options);

        this.credentials = options.credentials;
        this.data = [];
        this.type = options.type;
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

            debug( 'disk ftp' );

            diskList( directory, resolve )

        } else if ( self.type == 'ftp' ) {

            debug( 'list ftp' );

            ftpList( directory, self.credentials, resolve )

        }

    } );

    return this
};

Adapter.prototype.filter = function ( filter ) {


    debug( 'filter' );

    this._promise = this._promise.then( files=> {

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

        return _files;

    } );

    return this
};

Adapter.prototype.read = function ( encoding ) {

    let self = this;
    this._promise = this._promise.then( files=> {

        return new Promise( resolve=> {


            if ( this.type == 'disk' ) {

                diskRead()

            } else if ( this.type == 'ftp' ) {

                debug( 'read ftp' );
                ftpRead( files, encoding, this.credentials, resolve )

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

    debug( 'parse' );

    this._promise = this._promise.then( () => {


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

    let _files = fs.readdir( directory );


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

    let data = [];

    files.forEach( f=> {

        let text = fs.readFileSync( f, encoding );
        data.push( { text: text } )

    } );

    resolve( data )
}


function ftpList( directory, credentials, resolve ) {

    var c = Client();
    c.on( 'ready', function () {
        c.list( directory, function ( err, list ) {
            if ( err ) throw err;

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

function ftpRead( files, encoding, credentials, resolve ) {

    let promise = Promise.resolve();
    let data = [];

    files.forEach( f=> {

        promise = new Promise( resolveInner=> {
            var c = Client();
            c.on( 'ready', function () {

                c.get( f.path, function ( err, stream ) {
                    if ( err ) throw err;

                    let string = '';

                    stream.on( 'data', function ( buffer ) {

                        string += buffer.toString( encoding );
                    } );

                    stream.on( 'close', function ( response ) {

                        c.end();

                        data.push( {
                            text: string,
                            file: f.name
                        } );

                        resolveInner()

                    } );

                    stream.on( 'error', function ( response ) {

                        c.end();

                        data.push( {
                            text: string,
                            file: f.name
                        } );

                        resolveInner()

                    } );
                } );
            } ).connect( credentials );
        } )
    } );

    promise.then( ()=> {

        resolve( data )

    } );
}


module.exports = ( options )=> {
    return new Adapter( options )
};

// let ftp = new Adapter( {
//     credentials: {
//         host: process.env.HOST,
//         user: process.env.USER,
//         password: process.env.PASS,
//     },
//     type: 'ftp'
// } )
//
// ftp.list( '/opt/rsync/tips/pers' )
//     .filter( { type: 'include', files: ['Turer.csv'] } )
//     .read( 'binary' )
//     .parse(parse.crews)
//     .then( data=>[
//
//         // console.log( ftp.data[0].json[0] )
//
//     ] );