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
const IO=require('./index.js');
const moment=require('moment');


let ftp=IO({

    credentials: {
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASS,
        port:22
    },
    type: 'disk',
    // type: 'ftp',
});

ftp
    .list( 'c:/Users/s057wl/git/text_file_import/test' )
    // .list( '/opt/rsync/tips/trru' )
    .filter( [
        {type: 'include', files:['list_files.txt']},
        {type: 'last_modified',
            callback:last_modified=> {
            return last_modified > moment('2017-02-03').format( 'YYYY-MM-DD HH:mm' )
                //
                // callback:last_modified=> {
                //     return last_modified > moment('2017-02-02').format( 'YYYY-MM-DD HH:mm' )
        }}
    ] )
    .read( 'binary' )
    .then( data=>[

        console.log( ftp.data )

    ] ).catch(err=>{


    console.error(err)

});
