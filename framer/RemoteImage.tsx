// @ts-ignore
import { addPropertyControls, ControlType } from "framer";

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function RemoteImage(props: any) {
  return (
    <div style={{ ...containerStyle, paddingTop: `${props.paddingTop}px` }}>
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
  paddingTop: 0,
};

RemoteImage.defaultProps = {
  url: null,
  paddingTop: 0,
};

addPropertyControls(RemoteImage, {
  url: { type: ControlType.String, title: "Image URL" },
  paddingTop: { type: ControlType.Number, title: "Padding Top" },
});
