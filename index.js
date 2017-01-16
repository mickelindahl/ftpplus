/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

var Client = require( 'sftpjs' );
var c = Client();
require( 'dotenv' ).load();
const Promise = require( 'bluebird' );
const Path = require( 'path' )
const parse = require('parse')

let credentials = {
    host: process.env.HOST
    , user: process.env.USER
    , password: process.env.PASS
}

function diskList() {
}

function diskRead(){

}

function ftpList( directory, credentials, resolve ) {

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

function ftpRead(files, encoding, credentials, resolve){

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
                        console.log( 'close' )
                        data.push( {
                            text: string,
                            file: f
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

class Adapter {

    constructor( options ) {

        // super(options, options);

        this.credentials = options.credentials;
        this.data=[];
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

    this._promise = new Promise( resolve=> {

        if ( this.type == 'disk' ) {

            diskList( directory, resolve )

        } else if ( this.type == 'ftp' ) {

            ftpList( directory, this.credentials, resolve )

        }

    } );

    return this
};

Adapter.prototype.filter = function ( filter ) {

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

    let self=this;
    this._promise = this._promise.then( files=> {

        return new Promise( resolve=> {

            if ( this.type=='disk'){

                diskRead()

            }else if (this.type=='ftp'){

                ftpRead(files, encoding, this.credentials, resolve)

            }

        } ).then( data=> {

            console.log('this ->data')

            data.forEach(d=>{

                self.data.push(d)

            });

            // self.data=data;

        } );

    } );


    console.log( 'closese!!!' )


    return this

};

Adapter.prototype.parse = function ( parse ) {

    let data=this.data;

    console.log(data)

    this._promise = this._promise.then( () => {

        console.log('parse');

        let promise = Promise.resolve()

        data.forEach( d=> {

            promise=new Promise(resolve=> {

                parse( d ).then(json=>{

                    d.json=json;

                    resolve()
                })
            });
        } );

        return promise

    });

    return this

};


exports.module=(options)=>{
    return new Adapter(options)
};

// let ftp = new Adapter( {
//     credentials: credentials,
//     type: 'ftp'
// } )
//
// ftp.list( '/opt/rsync/tips/pers' )
//     .filter( { type: 'include', files: ['Turer.csv'] } )
//     .read( 'binary' )
//     .parse(parse.crews)
//     .then( data=>[
//
//         console.log( ftp.data[0].json[0] )
//
//     ] );