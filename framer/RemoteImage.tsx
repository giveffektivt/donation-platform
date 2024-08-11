import { addPropertyControls, ControlType } from "framer";

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function RemoteImage(props) {
  return (
    <div style={containerStyle}>
      {!!props.url && (
        <img
          src={props.url}
          alt="Image"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}

const containerStyle = {
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
};

RemoteImage.defaultProps = {
  url: null,
};

addPropertyControls(RemoteImage, {
  url: { type: ControlType.String, title: "Image URL" },
});
