'use strict';

var React = require('react');
var lodash = require('lodash');

var CryptoJS = require("crypto-js");

var socket = io.connect();

var pk = [];


var userShared = [];

var Modal = require('react-bootstrap/lib/Modal');
var Button = require('react-bootstrap/lib/Button');

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePublic(n, pk) {
	return n * pk;
}

function generateN() {
	return getRandomInt(21, 434);
}

function generatePK() {
	return getRandomInt(12, 33);
}

var UsersList = React.createClass({
	handleClick(e) {
		var privateKey = generatePK();
		var nKey = generateN()

		var param = {
			target: {
				id: e.target.id,
				nKey: nKey,
				nxKey: generatePublic(privateKey, nKey)
			},
			source: this.props.currentUser.id
		};

		pk.push({
			target: param.target,
			private: privateKey
		});

		console.log(param);

		socket.emit("request-chat", param);
	},

	render() {
		var userRendered;

		return (
			<div className='users'>
				<h3> Online Users </h3>
				<ul>
					{
						this.props.users.map((user, i) => {

							if (user.id === this.props.currentUser.id) {
								return (
									<li key={user.id}>
										{user.name}
									</li>
								);
							}
							return (
								<li key={user.id}>
									<a href="#" id={user.id} onClick={this.handleClick}>{user.name}</a>
								</li>
							);
						})
					}
				</ul>
			</div>
		);
	}
});


var Message = React.createClass({
	render() {
		return (
			<div className="message">
				<strong>{this.props.user} :</strong>
				<span>{this.props.text}</span>
			</div>
		);
	}
});

var MessageList = React.createClass({
	render() {
		return (
			<div className='messages'>
				<h2> Conversation: </h2>
				{
					this.props.messages.map((message, i) => {

						if (typeof message.user != 'undefined'){
							console.log('here comes',message.user);

							// ("name" in message.user)
							// var username = message.user.name ? message.user.name : message.user;
							return (
								<Message
									key={i}
									user={message.user}
									text={message.text}
								/>
							);
						}

						return (
							<span></span>
						);

					})
				}
			</div>
		);
	}
});

var MessageForm = React.createClass({

	getInitialState() {
		return {text: ''};
	},

	handleSubmit(e) {
		e.preventDefault();
		var message = {
			user : this.props.user.name,
			text : this.state.text,
			targetUser: 'frome anywhere'
		}

		console.log('nnonoono  ',this.props.user);
		this.props.onMessageSubmit(message);
		this.setState({ text: '' });
	},

	changeHandler(e) {
		this.setState({ text : e.target.value });
	},

	render() {
		return(
			<div className='message_form'>
				<h3>Write New Message</h3>
				<form onSubmit={this.handleSubmit}>
					<input
						onChange={this.changeHandler}
						value={this.state.text}
					/>
				</form>
			</div>
		);
	}
});

var ChangeNameForm = React.createClass({
	getInitialState() {
		return {newName: ''};
	},

	onKey(e) {
		this.setState({ newName : e.target.value });
	},

	handleSubmit(e) {
		e.preventDefault();
		var newName = this.state.newName;
		this.props.onChangeName(newName);
		this.setState({ newName: '' });
	},

	render() {
		return(
			<div className='change_name_form'>
				<h3> Change Name </h3>
				<form onSubmit={this.handleSubmit}>
					<input
						onChange={this.onKey}
						value={this.state.newName}
					/>
				</form>
			</div>
		);
	}
});

var ChatApp = React.createClass({

	getInitialState() {
		return {
			users: [],
			messages:[],
			text: '',
			targetUser: '',
			showModal: false,
			requester: {},
			keys: {}
		};
	},

	componentDidMount() {
		socket.on('init', this._initialize);
		socket.on('request-chat', this._handleRequestChat);
		socket.on('send:message', this._messageRecieve);
		socket.on('user:join', this._userJoined);
		socket.on('user:left', this._userLeft);
		socket.on('change:name', this._userChangedName);
		socket.on('chat-approved', this._approvedChat);
	},

	_approvedChat(data) {

		console.log('_approvedChat' ,data);

		var userApproval = lodash.filter(pk, function(userKeys){
		  return userKeys.target.id === data.source;
		});

		console.log('sharedKey _approvedChat' , userApproval[0].private * data.publicKeyApproval);
		userShared.push({
			target: data.source,
			sharedKey: userApproval[0].private * data.publicKeyApproval
		});

	},

	_handleRequestChat(data) {
		console.log(data);

		this.setState({
			showModal: true ,
			requester: data
		});
	},

	_initialize(data) {

		var users = data.users;
		var clientId = data.clientId;
		var currentUser = data.name;
		this.setState({users, user: currentUser});
	},

	_messageRecieve(message) {

		console.log('message arrive',message);
		var holder = this.state;
		var holderOutput = message;

		var bytes  = CryptoJS.AES.decrypt(message.text, userShared[0].sharedKey.toString());
		var plaintext = bytes.toString(CryptoJS.enc.Utf8);

		console.log('chipertext receiver', message.text);
		holderOutput.text = plaintext;
		holder.text = plaintext;

		var {messages} = holder;
		messages.push(plaintext);

		messages.push(holderOutput);

		console.log(messages);
		this.setState({messages});
	},

	_userJoined(data) {
		var {users, messages} = this.state;
		var {name} = data;
		users.push(name);
		// messages.push({
		// 	user: 'APPLICATION BOT',
		// 	text : name +' Joined'
		// });
		this.setState({users, messages});
	},

	_userLeft(data) {
		var {users, messages} = this.state;
		var {name} = data;
		var index = users.indexOf(name);
		users.splice(index, 1);
		messages.push({
			user: 'APPLICATION BOT',
			text : name +' Left'
		});
		this.setState({users, messages});
	},

	_userChangedName(data) {
		var {oldName, newName} = data;
		var {users, messages} = this.state;
		var index = users.indexOf(oldName);
		users.splice(index, 1, newName);
		messages.push({
			user: 'APPLICATION BOT',
			text : 'Change Name : ' + oldName + ' ==> '+ newName
		});
		this.setState({users, messages});
	},

	approve(){

		var privateKeyApproval = generatePK();

		var publicKeyApproval = generatePublic(privateKeyApproval, this.state.requester.nKey);

		var param = {
			publicKeyApproval: publicKeyApproval,
			targetId: this.state.requester.id
		};

		console.log('approval sharedKey ' , privateKeyApproval * this.state.requester.nxKey);
		userShared.push({
			target: this.state.requester.id,
			sharedKey: privateKeyApproval * this.state.requester.nxKey
		});

		console.log('param approval ',param);
		socket.emit("approve-chat", param);
    this.setState({
			showModal: false ,
			keys: param
		});
  },

	reject(){
    this.setState({ showModal: false });
  },

	handleMessageSubmit(message) {

		if (!userShared.length) {
			return;
		}

		var {messages} = this.state;


		messages.push(message);
		this.setState({messages});

		var ciphertext = CryptoJS.AES.encrypt(message.text, userShared[0].sharedKey.toString());

		console.log('ciphertext sender',ciphertext.toString());

		// console.log(userShared);


		socket.emit('send:message', {
			text: ciphertext.toString(),
			target: userShared[0].target,
			user: message.user
		});
	},

	handleChangeName(newName) {
		var oldName = this.state.user;
		socket.emit('change:name', { name : newName}, (result) => {
			if(!result) {
				return alert('There was an error changing your name');
			}
			var {users} = this.state;
			var index = users.indexOf(oldName);
			users.splice(index, 1, newName);
			this.setState({users, user: newName});
		});
	},

	render() {

		return (
			<div>

				<Modal show={this.state.showModal} onHide={this.close}>
          <Modal.Header closeButton>
            <Modal.Title>Request To Chat</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.state.requester.name} is asking to chat.
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.approve}>Approve</Button>
            <Button onClick={this.reject}>Reject</Button>
          </Modal.Footer>
        </Modal>

				<UsersList
					users={this.state.users} currentUser={this.state.user}
				/>
				<MessageList
					messages={this.state.messages}
				/>
				<MessageForm
					onMessageSubmit={this.handleMessageSubmit}
					user={this.state.user}

				/>

			</div>
		);
	}
});

React.render(<ChatApp/>, document.getElementById('app'));
