const SMTPServer = require("smtp-server").SMTPServer;

const server = new SMTPServer({
  disabledCommands: ['STARTTLS', 'AUTH'],
  logger: true,
  onData(stream, session, callback){
        stream.pipe(process.stdout); // print message to console
        stream.on('end', callback);
    }
});

server.listen(25);
console.log('smtp server listening on port 25');
