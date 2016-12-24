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
				user: e.target.user,
			},
			source: this.props.currentUser.id
		};



		socket.emit("request-chat", param);
	},

	render() {
		return (
			<div className='users'>
				<h3> Online Users </h3>
				<ul>
					{
						this.props.users.map((user, i) => {
							if (user.email) {

								if (user.id === this.props.currentUser.id) {
									return (
										<li key={user.id}>
											{user.name}
										</li>
									);
								}
								return (
									<li key={user.id}>
										<a href="#" id={user.id} user={user} onClick={this.handleClick}>{user.name}</a>
									</li>
								);
							}

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

var InputEmail = React.createClass({
	getInitialState() {
		return {
			isEmail: false,
			email: ''
		};
	},

	enterMail(e) {
		e.preventDefault();
		console.log('enterMail',this.state.email);
		this.props.onEmailSubmit(this.state.email);
	},

	changeHandler(e) {
		this.setState({ email : e.target.value });
	},

	render() {
		return (
			<div>
				<Modal show={ !this.props.isEmail } onHide={this.close}>
          <Modal.Header>
            <Modal.Title>Enter Your Email</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <input
							type="email"
							onChange={this.changeHandler}
							value={this.state.email} />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.enterMail}>submit</Button>
          </Modal.Footer>
        </Modal>
			</div>
		)
	}
});

var InputSentN = React.createClass({
	render() {
		return(
			<div>

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
			keys: {},
			isEmail: false,
			isInputN: false
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

		this.setState({
			isInputN: true
		});

	},

	_handleRequestChat(data) {
		this.setState({
			showModal: true ,
			requester: data
		});
	},

	_initialize(data) {

		var users = data.users;
		var clientId = data.clientId;
		var currentUser = data.name;
		// currentUser.email = data.email;
		console.log('users got me here',users);
		console.log('currentUser',currentUser);

		this.setState({
			users,
			user: currentUser,
			isEmail: true
		});
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

		this.setState({users});

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
			targetId: this.state.requester.id
		};

		userShared.push({
			target: this.state.requester.id
		});

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

		var {messages} = this.state;


		messages.push(message);
		this.setState({messages});

		var ciphertext = CryptoJS.AES.encrypt(message.text, userShared[0].sharedKey.toString());

		console.log('ciphertext sender',ciphertext.toString());



		socket.emit('send:message', {
			text: ciphertext.toString(),
			target: userShared[0].target,
			user: message.user
		});
	},

	handleEmailSubmit(email) {
		var newUser = {};
		newUser.email = email;

		socket.emit('change:email', newUser, (result) => {
			if(!result) {
				return alert('There was an error changing your email');
			}
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

				<InputEmail
					isEmail={this.state.isEmail}
					onEmailSubmit={this.handleEmailSubmit}
				/>

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
