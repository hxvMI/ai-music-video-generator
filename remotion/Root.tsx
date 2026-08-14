import { Composition } from "remotion";

import MusicVideoComposition from "../app/components/remotion/MusicVideoComposition";
import {
  DEFAULT_REMOTION_INPUT_PROPS,
  getMusicVideoCompositionMetadata,
} from "../app/lib/remotionDefaultProps";
import { MUSIC_VIDEO_COMPOSITION_ID } from "../app/lib/remotionCompositionConfig";

export default function RemotionRoot() {
  return (
    <Composition
      id={MUSIC_VIDEO_COMPOSITION_ID}
      component={MusicVideoComposition}
      defaultProps={DEFAULT_REMOTION_INPUT_PROPS}
      calculateMetadata={getMusicVideoCompositionMetadata}
    />
  );
}
