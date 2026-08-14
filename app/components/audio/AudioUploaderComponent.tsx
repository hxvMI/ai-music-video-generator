/* PURPOSE:
upload audio
validate file type
pass file to parent component
*/

"use client";

import FileDropzone from "@/components/ui/FileDropzone";

type AudioUploaderProps = {
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
};

export default function AudioUploader({
  audioFile,
  setAudioFile,
}: AudioUploaderProps) {
  // audioFile, setAudioFile are variable names
  // <File | null> set their respective TypeScript type
  // to either File or null depending
  // (null) is their initial values
  // regular let audioFile = null won't work cuz react won't update the UI
  // so we use a HOOK useState()
  // useState = "Remember this value and update the UI when it changes"

  /**
     v this called Array Destructuring
const [audioFile, setAudioFile] = useState<File | null>(null);

     v  without, it would look like this
       const result = useState(null)
       console.log(result);

       react would return  [
                             currentValue,
                             updateFunction
                           ]
       example:
                           [
                             null,
                             function updateState(){}
                           ]

       Destructuring extracts the 2 values into variables
       [
       audioFile,
       setAudioFile
       ]

       which become
       audioFile = currentValue
       setAudioFile = updateFunction

       by doing this:
   1st set the values
   const person = ["John", 25];

   2nd extract them into individual variables:
   const [name, age] = person;

   now you can do  console.log(name);
                   console.log(age);

 //using useState();
 //extracting songName, artistName, backgroundImage
 //note can only be done with one Variable and Function at a time
 const [songTitle, setSongTitle] = useState("");
 const [artistName, setArtistName] = useState("");
 const [backgroundImage, setBackgroundImage] = useState<File | null> (null);

   **/

  // We are lifting the state of these up to page so they are passed as props

  return (
    <FileDropzone
      label="Audio track"
      description="Upload the song for playback, visualization, and render timing. MP3 or WAV."
      accept={{
        "audio/*": [".mp3", ".wav"],
      }}
      selectedFile={audioFile}
      onFileChange={setAudioFile}
    />
  );
}
