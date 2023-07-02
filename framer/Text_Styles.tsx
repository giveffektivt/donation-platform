import type { ComponentType } from "react";

export const withEllipsisAfterTwoLines = (Component: any): ComponentType => {
  return (props: any) => {
    return (
      <Component
        {...props}
        style={{
          display: "-webkit-box",
          webkitLineClamp: "2",
          webkitBoxOrient: "vertical",
        }}
      />
    );
  };
};
