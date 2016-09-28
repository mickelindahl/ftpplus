/**
 * Created by s057wl on 2016-07-14.
 */

'use strict';

const Ftp=require('jsftp');
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

                debug(res);

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

        if (_callback) _callback(null, results);
        else return results

    }).catch((err)=>{

        if (_callback) _callback(err, null);
        else throw err

    });

}

function parse(ls, options){

    var files=[];
    if (ls==undefined){
        return files
    }

    var i=0;
    ls.split('\r\n').forEach(function(str){
        var file=str.split(' ').pop();

        debug(options.filter,file)

        if (options.filter && options.filter.indexOf(file)==-1) {
            return
        }

        if (options.exclude && options.exclude.indexOf(file)!=-1) {
            return
        }

        if(file==''){
            return
        }
        if (i>=options.limit){
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

                debug('close stream ' +file)

                str=options.skip && options.skip.fun(str, options.skip.options) ? '' : str;

                resolve({
                    text:str,
                    file:file
                });
            });
            socket.resume();
        })
    }).then((resolved)=>{

        if (options.post_process){

            // debug(resolved.text)
            // debug(options.post_process)
            return options.post_process(resolved).then((json)=>{

                debug('parsing to json done')

                resolved.json=json;
                return resolved;
            })

        }else return resolved;

    }).catch((err)=>{

        console.error(err);
        throw err

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

        // debug(resolved)

        resolved=resolved.reduce( (tot , val)=>{
            if (val.text!=''){
                tot.push(val)
            }
            return tot
        },[]);

        if (done) done(resolved);
        else return resolved;

        // results is an array of names
    });
}

module.exports={
    'fetch':fetch
}