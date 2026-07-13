import "./index.css";
import {Composition} from "remotion";
import {CatFillPromo} from "./Composition";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="CatFillPromo"
    component={CatFillPromo}
    durationInFrames={750}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{}}
  />
);
