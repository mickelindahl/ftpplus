/**
 * Created by s057wl on 2016-07-14.
 */

const Ftp=require('jsftp');
const Async=require('async');

function fetch(options, callback){

    try {
        var ftp = new Ftp(options.auth);
        options.ftp = ftp;
    }catch(err){
        console.error('ftp connect failed', err)
        throw err
    }
    try{
        ftp.list(options.path, function (err, res) {
            try {
                if (err) {
                    throw err
                }

                options.files = parse(res, options);

                get(options, callback);

                // callback(null,files)

            } catch (err) {
                callback(err)
            }
        });
    }catch(err){
        console.error('ftp list failed', err)
        throw err
    }
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

function get(options, callback){

    var calls=[];
    options.files.forEach(function(file){
        calls.push(function(_callback){
                if (options.bar != undefined) {
                    options.bar.setTotal(options.files.length).tick('Fetching: '+ file)
                };

                var str = '';
                // console.debug('path', path)
                options.ftp.get(options.path+file, function (err, socket) {

                    if (err) {
                        console.error('ftp get failed', err);

                        _callback(null, {
                            text:str,
                            file:file
                        });

                        return
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
                            console.error('ftp get close failed', err);
                        }
                        _callback(null, {
                            text:str,
                            file:file
                        });
                    });
                    socket.resume();
                })
        })
    });

    Async.series(calls,
        function(err,results){
        callback(err, results);
    })
}

module.exports={
    'fetch':fetch
}