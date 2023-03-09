import React, {Component} from 'react';
import Navigation from './components/navigation/Navigation';
import Logo from './components/logo/Logo';
import ImageLinkForm from './components/ImageLinkForm/ImageLinkForm';
import Rank from './components/Rank/Rank';
import FaceRecognition from './components/FaceRecognition/FaceRecognition';
import SignIn from './components/SignIn/SignIn';
import Register from './components/Register/Register';
import ParticlesBg from 'particles-bg';
import './App.css';
import SERVER_URL from './components/Constants.js';

const initialState = {
      input: '',
      imgURL:'',
      boxes: [],
      route: 'signin',
      isSignedIn: false,
      user: {
        id: '',
        name: '',
        email: '',
        entries: 0,
        joined: ''
      }
}


class App extends Component {
  constructor() {
    super();
    this.state = initialState;
  }

  loadUser = (data) => {
    this.setState({user: {
      id: data.id,
      name: data.name,
      email: data.email,
      entries: data.entries,
      joined: data.joined
    }})
  }

  calcFaceLocation = (data) => {
    return data.outputs[0].data.regions.map(face => {
      const clarifaiFace = face.region_info.bounding_box;
      const image=document.getElementById('inputImage');
      const width = Number(image.width);
      const height = Number(image.height);
      return {
        leftCol: clarifaiFace.left_col * width,
        topRow: clarifaiFace.top_row * height,
        rightCol: width - (clarifaiFace.right_col * width),
        bottomRow: height - (clarifaiFace.bottom_row * height)
      }
    });
  }

  displayFaceBox = (boxes) => {
    this.setState({boxes: boxes});
  }

  onInputChange = (event) => {
    this.setState({input: event.target.value});
  }

  onButtonSubmit = () => {
    this.setState({imgURL: this.state.input});
    fetch(`${SERVER_URL}/imageAPI`, {
              method: 'post',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                input: this.state.input                
              })
            })
      .then(response => response.json())
      .then(res => {
          if (res) {
            fetch(`${SERVER_URL}/image`, {
              method: 'put',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                id: this.state.user.id                
              })
            })
            .then(res => res.json())
            .then(count => {
              this.setState(Object.assign(this.state.user, {entries: count}))
            })
          }
        this.displayFaceBox(this.calcFaceLocation(res))})
        .catch(error => console.log('error', error));
  }

  onRouteChange = (route) => {
    if (route === 'signin') {
      this.setState(initialState)
    } else if (route ==='home') {
      this.setState({isSignedIn: true})
    }
    this.setState({route: route});
  }

  render() {
    return (
      <div className="App">
        <ParticlesBg type="cobweb" bg={true} num={100} color='#EBEBEB' />
        <Navigation isSignedIn={this.state.isSignedIn} onRouteChange={this.onRouteChange} />
        { this.state.route === 'home'
          ?
          <div>
              <Logo />
              <Rank name={this.state.user.name} entries={this.state.user.entries} />
              <ImageLinkForm 
                onInputChange={this.onInputChange}
                onButtonSubmit={this.onButtonSubmit}
              />
              <FaceRecognition boxes={this.state.boxes} imgURL={this.state.imgURL} />
          </div>
          : (
              this.state.route === 'signin'
              ? <SignIn loadUser={this.loadUser} onRouteChange={this.onRouteChange} />
              : <Register loadUser={this.loadUser} onRouteChange={this.onRouteChange} />
            )          
        }
      </div>
    );
  }
}

export default App;
