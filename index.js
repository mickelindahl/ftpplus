/**
 * Created by s057wl on 2016-07-14.
 */

const Ftp=require('jsftp');
const Async=require('async');

function fetch(options, callback){

    var ftp = new Ftp(options.auth);
    options.ftp=ftp;
    ftp.list(options.path, function (err, res) {
        try {
            if (err) {
                throw err
            }

            options.files = parse(res, options);

            get(options, callback);

            // callback(null,files)

        }catch(err){
            callback(err)
        }
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

        if (options.lower!=undefined) {
            if (file <= options.lower!=undefined) {
                return
            }
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
            try {
                if (options.bar != undefined) {
                    options.bar.setTotal(files.length).tick('Fetching: '+ options.file)
                }

                var str = '';
                // console.debug('path', path)
                options.ftp.get(options.path+file, function (err, socket) {

                    if (err) {
                        console.error(err);
                        _callback(err, null);
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
                            console.error(err);
                            _callback(err);
                        }else {
                            _callback(null, {
                                text:str,
                                file:file
                            });
                        }
                    });
                    socket.resume();
                })
            }catch(err){
                _callback(err)
            }
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