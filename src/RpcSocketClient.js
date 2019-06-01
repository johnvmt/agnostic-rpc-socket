import EventEmitter from 'wolfy87-eventemitter';
import {AgnosticRpcClient, AgnosticRpc} from 'agnostic-rpc';

class RpcSocketClient extends EventEmitter {
	constructor(socket, options = {}) {
		super();

		const self = this;

		self.socket = socket;
		self.client = new AgnosticRpcClient();

		const onClientRequest = (request) => {
			self.socket.send(JSON.stringify(request.encoded));
		};

		self.client.on('request', onClientRequest);

		self.socket.on('close', () => {
			self.client.requests.forEach((requestController) => {
				try {
					requestController.cancel();
				}
				catch (error) {}
			});

			self.emit('close');
		});

		self.socket.on('message', (encodedMessageString) => {
			try {
				const encodedMessage = JSON.parse(encodedMessageString);
				if(AgnosticRpc.messageIsResponse(encodedMessage))
					self.client.handleResponse(encodedMessage);
			}
			catch(error) {
				self.emit('error', error);
			}
		});

		self.socket.on('close', () => {
			self.client.off('request', onClientRequest);
		});
	}
}

export default RpcSocketClient;
