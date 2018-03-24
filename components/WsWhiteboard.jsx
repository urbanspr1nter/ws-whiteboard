import React from 'react';
import Colors from './lib/Colors';
import PenBoard from './PenBoard.jsx';
import Button from './Button.jsx';

export default class WsWhiteboard extends React.Component {
    constructor(props) {
        super(props);

        this.clearHandler = this.clearHandler.bind(this);
        this.addPaletteHandlers = this.addPaletteHandlers.bind(this);

        this.state = {
            sessionId: this.props.sessionId,
            sequence: 0,
            canvasWidth: this.props.width,
            canvasHeight: this.props.height,
            canvas: null,
            canvasContext : null,
            penColor: null,
            penWidth: 1,
            mouseClicked: false,
            x: 0,
            y: 0,
            statusMessage: 'No one is drawing.',
            user: {
                name: 'No one'
            }
        };
    }

    mouseDown(event) {
        const e = event;
        e.preventDefault();
        const currX = Math.floor(e.pageX - this.state.canvas.offsetLeft);
        const currY = Math.floor(e.pageY - this.state.canvas.offsetTop);

        this.setState({
            x: currX,
            y: currY,
            mouseClicked: true,
            statusMessage: `${this.state.user.name} is drawing.`
        }, () => {
            this.state.canvasContext.beginPath();
            this.state.canvasContext.moveTo(this.state.x, this.state.y);

            const data = JSON.stringify({
                type: 'move',
                x: this.state.x,
                y: this.state.y,
                color: {
                    r: this.state.penColor.r,
                    g: this.state.penColor.g,
                    b: this.state.penColor.b
                },
                sessionId: this.props.sessionId,
                sequence: this.state.sequence
            });

            // socket emit
            this.setState({
                sequence: this.state.sequence + 1
            }, () => {
                this.props.socket.emit('push', data);
            });
        });
    }

    mouseUp(event) {
        const e = event;
        e.preventDefault();
        this.setState({
            mouseClicked: false,
            x: 0,
            y: 0,
            statusMessage: 'No one is drawing.'
        });
    }

    mouseMove(event) {
        const e = event;
        e.preventDefault();
        if(this.state.mouseClicked) {
            const currX = Math.floor(e.pageX - this.state.canvas.offsetLeft);
            const currY = Math.floor(e.pageY - this.state.canvas.offsetTop);

            this.setState({
                x: currX,
                y: currY
            }, () => {
                this.state.canvasContext.lineTo(this.state.x, this.state.y);
                this.state.canvasContext.stroke();

                const data = JSON.stringify({
                    type: 'draw',
                    x: this.state.x,
                    y: this.state.y,
                    color: {
                        r: this.state.penColor.r,
                        g: this.state.penColor.g,
                        b: this.state.penColor.b
                    },
                    name: this.state.user.name,
                    sessionId: this.props.sessionId,
                    sequence: this.state.sequence
                });

                // socket emit
                this.setState({
                    sequence: this.state.sequence + 1
                }, () => {
                    this.props.socket.emit('push', data);
                });
            });
        }
    }

    clearHandler() {
        this.props.socket.emit('clear', JSON.stringify({
            type: 'clear',
            x: 0,
            y: 0,
            sessionId: this.props.sessionId
        }));
    }

    setColor(color, callback) {
        this.setState({
            penColor: color
        }, () => {
            this.state.canvasContext.strokeStyle = Colors.getRgbCss(this.state.penColor);

            if(typeof callback !== 'undefined') {
                callback();
            }
        });
    }

    setPenWidth(width, callback) {
        this.setState({
            penWidth: width
        }, () => {
            this.state.canvasContext.lineWidth = this.state.penWidth;

            if(typeof callback !== 'undefined') {
                callback();
            }
        });
    }

    clear(data) {
        this.state.canvasContext.fillStyle = 'rgb(255, 255, 255)';
        this.state.canvasContext.fillRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        this.state.canvasContext.beginPath();
        this.state.canvasContext.moveTo(0, 0);
    }

    move(data) {
        this.state.canvasContext.beginPath();
        this.state.canvasContext.moveTo(data.x, data.y);
    }

    draw(data) {
        const red = parseInt(data.color.r);
        const green = parseInt(data.color.g);
        const blue = parseInt(data.color.b);

        const originalPenColor = this.state.canvasContext.strokeStyle;
        this.state.canvasContext.strokeStyle = Colors.getRgbCss({
            r: red,
            g: green,
            b: blue
        });

        this.state.canvasContext.lineTo(data.x, data.y);
        this.state.canvasContext.stroke();
        this.state.canvasContext.strokeStyle = originalPenColor;
    }

    componentDidMount() {
        fetch(`/traces?sid=${this.props.sessionId}`).then((response) => {
            return response.json();
        }).then((response) => {
            const traces = response;
            for(let i = 0; i < traces.length; i++) {
                const data = traces[i];
                if(data.type === 'move') {
                    this.move(data);
                } else if(data.type === 'draw') {
                    this.draw(data);
                }
            }
        }).then((result) => {

        });

        this.setState({
            canvas: document.getElementById('mainCanvas')
        }, () => {
            this.state.canvas.width = this.state.canvasWidth;
            this.state.canvas.height = this.state.canvasHeight;

            this.setState({
                canvasContext: this.state.canvas.getContext('2d'),
                penColor: { r: 0, g: 0, b: 0 }
            }, () => {
                this.state.canvasContext.strokeStyle = Colors.getRgbCss(this.state.penColor);
                this.state.canvasContext.lineWidth = this.state.penWidth;

                this.props.socket.on('receive', (data) => {
                    data = JSON.parse(data);

                    const callback = () => {
                        this.setState({
                            statusMessage: `${data.name} is drawing.`,
                            sequence: data.sequence
                        }, () => {
                            if(data.type === 'move') {
                                this.move(data);
                            } else if(data.type === 'draw') {
                                this.draw(data);
                            }
                        });
                    };
        
                    if(red === 255 && green === 255 && blue === 255) {
                        this.setState({
                            penWidth: 8
                        }, () => {
                            callback();
                        });
                    } else {
                        this.setState({
                            penWidth: 1
                        }, () => {
                            callback();
                        })
                    }
                });
        
                this.props.socket.on('clear', (data) => { this.clear(data) });
            });
        });
    }

    addPaletteHandlers(event) {
        const e = event;
        const color = e.target.dataset['color'];
        this.setPenWidth(1);
        switch(color) {
            case 'red':
                this.setColor(Colors.Red);
                break;
            case 'orange':
                this.setColor(Colors.Orange);
                break;
            case 'yellow':
                this.setColor(Colors.Yellow);
                break;
            case 'green':
                this.setColor(Colors.Green);
                break;
            case 'blue':
                this.setColor(Colors.Blue);
                break;
            case 'purple':
                this.setColor(Colors.Purple);
                break;
            case 'black':
                this.setColor(Colors.Black);
                break;
            case 'white':
                this.setColor(Colors.White);
                this.setPenWidth(8);
                break;
        }
    }

    changeName() {
        const newUser = Object.assign({}, this.state.user);
        newUser.name = document.getElementById('name').value;

        this.setState({
            user: newUser
        });
    }

    aboutHandler() {
        alert('Concept of a whiteboard using socket.io. by Roger Ngo (rogerngo.com)');
    }

    render() {
        const sessionId = this.props.sessionId === '' ? 'New Session' : `Session ID: ${this.props.sessionId}`;

        return (
            <div className='digiboard_container'>
                <div className='digiboard_header-container'>
                    <p>{this.state.statusMessage} / {sessionId}</p>
                </div>
                <div className='digiboard_form-input'>
                    <label>Name</label>
                    <input 
                        onChange={this.changeName.bind(this)} 
                        type='text' 
                        name='name' 
                        id='name' 
                        defaultValue='YOUR NAME' 
                    />
                </div>
                <div className='digiboard_canvas-container'>
                    <canvas id='mainCanvas' 
                        onMouseDown={this.mouseDown.bind(this)} 
                        onMouseUp={this.mouseUp.bind(this)} 
                        onMouseMove={this.mouseMove.bind(this)}
                        onTouchStart={this.mouseDown}
                        onTouchMove={this.mouseMove}
                        onTouchEnd={this.mouseUp}>
                    </canvas>
                </div>
                <PenBoard onClick={this.addPaletteHandlers} />
                <div className='control-panel'>
                    <Button label='Clear Whiteboard' onClick={this.clearHandler} />
                    <Button label='About' onClick={this.aboutHandler} />
                </div>
            </div>
        );

    }
}