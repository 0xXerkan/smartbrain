import React, { Component } from "react";
import Navigation from "./components/navigation/Navigation";
import Logo from "./components/logo/Logo";
import ImageLinkForm from "./components/ImageLinkForm/ImageLinkForm";
import Rank from "./components/Rank/Rank";
import FaceRecognition from "./components/FaceRecognition/FaceRecognition";
import SignIn from "./components/SignIn/SignIn";
import Register from "./components/Register/Register";
import ParticlesBg from "particles-bg";
import "./App.css";
import SERVER_URL from "./components/Constants.js";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const initialState = {
  input: "",
  imgURL: "",
  boxes: [],
  route: "signin",
  isSignedIn: false,
  isDemo: false,
  user: {
    id: "",
    name: "",
    email: "",
    entries: 0,
    joined: "",
  },
};

class App extends Component {
  constructor() {
    super();
    this.state = initialState;
  }

  faceDetector = null;

  getOrCreateFaceDetector = async () => {
    if (this.faceDetector) return this.faceDetector;
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );
    //define model asset path here. More models can be found here: https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector#models
    const modelAssetPath =
      "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite";

    this.faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
    });
    return this.faceDetector;
  };

  loadUser = (data) => {
    this.setState({
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        entries: data.entries,
        joined: data.joined,
      },
    });
  };

  setDemoMode = () => {
    // console.log("Demo mode activated");
    this.setState({
      user: {
        name: "Demo User",
        entries: 0,
      },
    });
    this.setState({ isDemo: true });
  };
  
  calcFaceLocation = async (imageUrl) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    const faceDetector = await this.getOrCreateFaceDetector();
    const result = faceDetector.detect(img);

    const renderedWidth = 500;
    const scaleFactor = renderedWidth / img.naturalWidth;
    const renderedHeight = img.naturalHeight * scaleFactor;

    return result.detections.map((detection) => {
      const { originX, originY, width, height } = detection.boundingBox;
      return {
        leftCol: originX * scaleFactor,
        topRow: originY * scaleFactor,
        rightCol: renderedWidth - (originX + width) * scaleFactor,
        bottomRow: renderedHeight - (originY + height) * scaleFactor,
      };
    });
  };

  displayFaceBox = (boxes) => {
    this.setState({ boxes: boxes });
  };

  onInputChange = (event) => {
    this.setState({ input: event.target.value });
  };

  onButtonSubmit = async () => {
    this.setState({ imgURL: this.state.input });
    try {
      const boxes = await this.calcFaceLocation(this.state.input);
      this.displayFaceBox(boxes);
      if (this.state.isDemo) {
        const updatedEntries = Number(this.state.user.entries) + 1;
        this.setState(Object.assign(this.state.user, { entries: updatedEntries }));
      } else {
        fetch(`${SERVER_URL}/image`, {
          method: "put",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: this.state.user.id,
          }),
        })
          .then((res) => res.json())
          .then((count) => {
            this.setState(Object.assign(this.state.user, { entries: count }));
          });
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  onRouteChange = (route) => {
    if (route === "signin") {
      this.setState(initialState);
    } else if (route === "home") {
      this.setState({ isSignedIn: true });
    }
    this.setState({ route: route });
  };

  render() {
    return (
      <div className="App">
        <ParticlesBg type="cobweb" bg={true} num={100} color="#EBEBEB" />
        <Navigation
          isSignedIn={this.state.isSignedIn}
          onRouteChange={this.onRouteChange}
        />
        {this.state.route === "home" ? (
          <div>
            <Logo />
            <Rank
              name={this.state.user.name}
              entries={this.state.user.entries}
            />
            <ImageLinkForm
              onInputChange={this.onInputChange}
              onButtonSubmit={this.onButtonSubmit}
            />
            <FaceRecognition
              boxes={this.state.boxes}
              imgURL={this.state.imgURL}
            />
          </div>
        ) : this.state.route === "signin" ? (
          <SignIn loadUser={this.loadUser} onRouteChange={this.onRouteChange} setDemoMode={this.setDemoMode} />
        ) : (
          <Register
            loadUser={this.loadUser}
            onRouteChange={this.onRouteChange}
          />
        )}
      </div>
    );
  }
}

export default App;
