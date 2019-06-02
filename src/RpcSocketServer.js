// Link WebSocket with RPC Server and Client
import EventEmitter from 'wolfy87-eventemitter';
import {AgnosticRpcServer} from 'agnostic-rpc';

class RpcSocketServer extends EventEmitter {
	constructor(socket, options = {}) {
		super();

		const self = this;

		self.serverRequests = new Map();

		self.socket = socket;
		self.server = new AgnosticRpcServer();

		const onServerResponse = (response) => {
			self.socket.send(JSON.stringify(response.encoded));
		};

		const onServerRequest = (requestController) => {
			if(!self.serverRequests.has(requestController.requestId)) {
				self.serverRequests.set(requestController.requestId, requestController);
				requestController.once('end', () => {
					self.serverRequests.delete(requestController.requestId);
				});
			}
		};

		self.socket.on('close', () => {
			self.serverRequests.forEach((requestController) => {
				try {
					requestController.cancel();
				}
				catch(error) {}
			});

			self.emit('close');
		});

		self.socket.on('message', (encodedMessageString) => {
			try {
				const encodedMessage = JSON.parse(encodedMessageString);
				encodedMessage.options = Object.assign(Object.assign((typeof encodedMessage.options === 'object' && encodedMessage.options !== null) ? encodedMessage.options : {}, {socket: socket}), encodedMessage); // Attach socket to options
				self.server.handleMessage(encodedMessage); // Will ignore responses, will only handle requests
			}
			catch(error) {
				self.emit('error', error);
			}
		});

		self.server.on('request', onServerRequest);
		self.server.on('response', onServerResponse);

		self.socket.on('close', () => {
			self.server.off('response', onServerResponse);
			self.server.off('request', onServerRequest);
		});
	}
}

export default RpcSocketServer;
