/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

// var Client = require( 'sftpjs' );
// var c = Client();§
require( 'dotenv' ).load();
// const Promise = require( 'bluebird' );
// const Path = require( 'path' )
// const parse = require('parse')
const IO=require('./index.js')


let ftp=IO({

    credentials: {
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASS,
        port:22
    },
    type: 'ftp',
})

ftp
    .list( '/opt/rsync/tips/trru' )
    .read( )
    .then( data=>[

        console.log( ftp.data )

    ] ).catch(err=>{


    console.error(err)

});
