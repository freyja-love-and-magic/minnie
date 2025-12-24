const SMTPServer = require("smtp-server").SMTPServer;

const server = new SMTPServer({
  disabledCommands: ['STARTTLS', 'AUTH'],
  logger: true,
  onData(stream, session, callback){
        stream.pipe(process.stdout); // print message to console
        stream.on('end', callback);
    }
});

server.listen(2525);
console.log('should be listening on 2525');
