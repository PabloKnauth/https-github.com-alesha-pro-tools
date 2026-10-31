import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { WidgetsFlotantes } from "./WidgetsFlotantes";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="WidgetsFlotantes"
        component={WidgetsFlotantes}
        durationInFrames={208}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
