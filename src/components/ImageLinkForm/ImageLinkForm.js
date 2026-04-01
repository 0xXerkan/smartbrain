import React from "react";
import "./ImageLinkForm.css";

const ImageLinkForm = ({ onInputChange, onButtonSubmit }) => {
  return (
    <div>
      <p className="f3">
        This Magic Brain will detect faces in your pictures. Give it a try!
      </p>
      <p className="f3">
        Enter the URL of an image that contains faces and click the Detect
        button.
      </p>
      {/* <p className="f3">
        Tip: You can try these URLs for testing:
        <br />
        https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdPRpLNmVVJuPPFpBczltxW7wLa63HEkpD971resYrquyJpDM1OtibEoVo8d1F7pjqNciwMrdQcTfByDOLW1DqDnTypKbbCgRFnHsBnrWwlQ&s=10
        <br /> <br />
        https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx0A8lZiL-5ybiTk6lx3vJPkh-1npUdX31L3RKTnvdkOEDAy9knb4d-8We7q_ib_r0iSKzgiyiMuWxJVvWfP2R4WjezAxr4meAezCSgNSwKw&s=10
      </p> */}
      <div className="center">
        <div className="form center pa4 br3 shadow-5">
          <input
            className="f4 pa2 w-70 center"
            type="text"
            onChange={onInputChange}
          />
          <button
            className="w-30 grow f4 link ph3 pv2 dib white bg-light-purple"
            onClick={onButtonSubmit}
          >
            Detect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageLinkForm;
