/**
 * Created by s057wl on 2016-07-14.
 */

'use strict';

const Ftp=require('jsftp');
const Async=require('async');
const Promise=require('bluebird');
const debug=require('debug')('ftpplus');

let _callback;

function fetch(options, callback){

    _callback=callback;

    return new Promise((resolve,reject)=>{

        try {

            var ftp = new Ftp(options.auth);
            options.ftp = ftp;

            debug('ftp created')

            resolve(options)
        }catch(err) {

            reject(err)

        }

    }).then((options)=>{

        return new Promise((resolve, reject)=> {
            options.ftp.list(options.path, function (err, res) {

                if (err) reject(err);

                try {

                    options.files = parse(res, options);

                    debug('files parsed', options.files)

                    resolve(options);

                } catch (err) {

                    reject(err)
                }
            });
        })
    }).then((options)=>{

        return get(options)

    }).then((results)=>{
        if (_callback) _callback(null, results)
        else return results
    }).catch((err)=>{
        if (_callback) _callback(err, null)
        else throw err
    });

    // try{
    //     ftp.list(options.path, function (err, res) {
    //         try {
    //             if (err) {
    //                 throw err
    //             }
    //
    //             options.files = parse(res, options);
    //
    //             get(options, callback);
    //
    //             // callback(null,files)
    //
    //         } catch (err) {
    //             callback(err)
    //         }
    //     });
    // }catch(err){
    //     console.error('ftp list failed', err)
    //     throw err
    // }
}

function parse(ls, options){

    var files=[];
    if (ls==undefined){
        return files
    }

    var i=0;
    ls.split('\r\n').forEach(function(str){
        var file=str.split(' ').pop();

        if (options.filter && options.filter.indexOf(file)!=-1) {
            return
        }

        if(file==''){
            return
        }
        if (i>options.limit){
            return
        }
        files.push(file);
        i+=1;
    });

    return files

}

function stream(file, options){

    return new Promise((resolve, reject)=>{

        if (options.bar != undefined) {
            options.bar.setTotal(options.files.length).tick('Fetching: '+ file)
        };

        var str = '';
        // console.debug('path', path)
        options.ftp.get(options.path+file, function (err, socket) {

            if (err) {
                return reject( {
                    text:str,
                    file:file,
                    err:err,
                });
            };

            socket.on("data", function (buffer) {

                // binary encoding needed for loken
                if (options.encoding != undefined) {
                    str += buffer.toString(options.encoding);
                } else {
                    str += buffer.toString();
                }
            });

            socket.on("close", function (err) {
                if (err) {
                    return reject( {
                        text:str,
                        file:file,
                        err:err,
                    });

                }

                str=options.skip && options.skip(str) ? '' : str;

                resolve({

                    text:str,
                    file:file

                });
            });
            socket.resume();
        })
    }).catch((result)=>{

        console.error(result.err);
        return result
    })
}

function get(options, done){


    // start with current being an "empty" already-fulfilled promise
    var current = Promise.resolve();

    return Promise.all(options.files.map((file)=> {
        current = current.then(function() {
            return stream(file, options)
        });
        return current;
    })).then((resolved)=> {
        return options.post_process
            ? options.post_process(resolved)
            : resolved

    }).then((resolved)=> {

        if (done) done(resolved);
        else return resolved;

        // results is an array of names
    });


    // var calls=[];
    // options.files.forEach(function(file){
    //     calls.push(function(_callback){
    //         if (options.bar != undefined) {
    //             options.bar.setTotal(options.files.length).tick('Fetching: '+ file)
    //         };
    //
    //         var str = '';
    //         // console.debug('path', path)
    //         options.ftp.get(options.path+file, function (err, socket) {
    //
    //             if (err) {
    //                 console.error('ftp get failed', err);
    //
    //                 _callback(null, {
    //                     text:str,
    //                     file:file
    //                 });
    //
    //                 // console.log('closing socket');
    //                 // socket.emit('close');
    //
    //                 return
    //             };
    //
    //             socket.on("data", function (buffer) {
    //
    //                 // binary encoding needed for loken
    //                 if (options.encoding != undefined) {
    //                     str += buffer.toString(options.encoding);
    //                 } else {
    //                     str += buffer.toString();
    //                 }
    //             });
    //
    //             socket.on("close", function (err) {
    //                 if (err) {
    //                     console.error('ftp get close failed', err);
    //                 }
    //                 _callback(null, {
    //                     text:str,
    //                     file:file
    //                 });
    //             });
    //             socket.resume();
    //         })
    //     })
    // });
    //
    // Async.series(calls,
    //     function(err,results){
    //         callback(err, results);
    //     })
}

module.exports={
    'fetch':fetch
}