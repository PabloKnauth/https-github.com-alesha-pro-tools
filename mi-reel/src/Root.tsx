import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { WidgetsFlotantes } from "./WidgetsFlotantes";
import { MotoRokaServicio } from "./MotoRokaServicio";
import { RegalosMotoRoka } from "./RegalosMotoRoka";
import { PabloKnauth } from "./PabloKnauth";

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
      <Composition
        id="MotoRokaServicio"
        component={MotoRokaServicio}
        durationInFrames={838}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="RegalosMotoRoka"
        component={RegalosMotoRoka}
        durationInFrames={787}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PabloKnauth"
        component={PabloKnauth}
        durationInFrames={659}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
