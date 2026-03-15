let wakelock: WakeLockSentinel | true | null = null;
let autoReleaseWakeLockTime = 0;

class KeepAwakeByVideo {
  static readonly mp4Src =
    "data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAyBtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAA" +
    "PoAAAAGwABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAACAAACSnRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAGwAAAAAAAAAAAAAAAQEAAAAAAQAAAAAAAA" +
    "AAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAABoAAAgAAAEAAAAAAc" +
    "JtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAKxEAAAEgFXEAAAAAAAxaGRscgAAAAAAAAAAc291bgAAAAAAAAAAAAAAAENvcmUgTW" +
    "VkaWEgQXVkaW8AAAABaW1pbmYAAAAQc21oZAAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABL" +
    "N0YmwAAAB7c3RzZAAAAAAAAAABAAAAa21wNGEAAAAAAAAAAQAAAAAAAAAAAAIAEAAAAACsRAAAAAAAM2VzZHMAAAAAA4CAgCIAAQA" +
    "EgICAFEAVAAAAAAJ/9wACf/cFgICAAhIQBoCAgAECAAAAFGJ0cnQAAAAAAAJ/9wACf/cAAAAgc3R0cwAAAAAAAAACAAAAAwAABAAAA" +
    "AABAAAAgAAAABxzdHNjAAAAAAAAAAEAAAABAAAABAAAAAEAAAAkc3RzegAAAAAAAAAAAAAABAAAAXMAAAF0AAABcwAAAXQAAAAUc3R" +
    "jbwAAAAAAAAABAAADTAAAABpzZ3BkAQAAAHJvbGwAAAACAAAAAf//AAAAHHNiZ3AAAAAAcm9sbAAAAAEAAAAEAAAAAQAAAGJ1ZHRhA" +
    "AAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAAB" +
    "MYXZmNTguNzYuMTAwAAAACGZyZWUAAAXWbWRhdCERRQAUUAFG//EKWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW" +
    "lpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW" +
    "lpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aXemCFLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t" +
    "LS0tLS0tLS0tLS0tLS0tLS8IRFFABRQAUb/8QpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW" +
    "lpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpd6aIUtLS0tLS0t" +
    "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS" +
    "0tLS0tLS8IRFFABRQAUb/8QpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW" +
    "lpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW" +
    "lpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpd6YIUtLS0tLS0tLS0tLS0tLS0tLS" +
    "0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLwhEUUAF" +
    "FABRv/xClpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaW" +
    "lpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlp" +
    "aWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWl3pohS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t" +
    "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLw=";

  static readonly webmSrc =
    "data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAANXEU2bdLpNu4tTq4QV" +
    "SalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggE/TbuMU6uEHFO7a1OsggNB7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsi" +
    "rXsYMPQkBNgI1MYXZmNTguNzYuMTAwV0GNTGF2ZjU4Ljc2LjEwMESJiEBBAAAAAAAAFlSua+KuAQAAAAAAAFnXgQFzxYjHh4Jmxpm3C" +
    "5yBACK1nIN1bmSGhkFfT1BVU1aqg2MuoFa7hATEtACDgQLhkZ+BArWIQOdwAAAAAABiZIEYY6KTT3B1c0hlYWQBAjgBgLsAAAAAABJU" +
    "w2dB03NzAQAAAAAAAQ5jwIBnyAEAAAAAAAAVRaOLTUFKT1JfQlJBTkREh4RxdCAgZ8gBAAAAAAAAFEWjjU1JTk9SX1ZFUlNJT05Eh4E" +
    "wZ8gBAAAAAAAAG0WjkUNPTVBBVElCTEVfQlJBTkRTRIeEcXQgIGfIAQAAAAAAABlFo4hUSU1FQ09ERUSHizAwOjAwOjAwOjAwZ8gBAA" +
    "AAAAAAKkWjn0NPTS5BUFBMRS5RVUlDS1RJTUUuRElTUExBWU5BTUVEh4VlbXB0eWfIAQAAAAAAACRFo5lDT00uQVBQTEUuUVVJQ0tUS" +
    "U1FLlRJVExFRIeFZW1wdHlnyAEAAAAAAAAaRaOHRU5DT0RFUkSHjUxhdmY1OC43Ni4xMDBzcwEAAAAAAACxY8CLY8WIx4eCZsaZtwtn" +
    "yAEAAAAAAAAiRaOMSEFORExFUl9OQU1FRIeQQ29yZSBNZWRpYSBBdWRpb2fIAQAAAAAAABtFo4lWRU5ET1JfSUREh4xbMF1bMF1bMF1" +
    "bMF1nyAEAAAAAAAAjRaOHRU5DT0RFUkSHlkxhdmM1OC4xMzQuMTAwIGxpYm9wdXNnyKJFo4hEVVJBVElPTkSHlDAwOjAwOjAwLjAzND" +
    "AwMDAwMAAAH0O2daTngQCjh4EAAID8//6gAQAAAAAAAA+hh4EAFQD8//51ooNwiJgcU7trkbuPs4EAt4r3gQHxggMY8IED";

  private static async keepAwake() {
    KeepAwakeByVideo.enabled = true;
    const loop = () => {
      if (KeepAwakeByVideo.enabled && KeepAwakeByVideo.video) {
        KeepAwakeByVideo.video.play();
        setTimeout(loop, 10000);
      }
    };
    loop();
  }

  private static enabled = false;
  private static video: HTMLVideoElement | undefined;

  private static initialize() {
    window.addEventListener("click", function enable() {
      window.removeEventListener("click", enable);

      // Initialize video element
      KeepAwakeByVideo.video = document.createElement("video");
      KeepAwakeByVideo.video.setAttribute("playsinline", "");

      // Add mp4 source
      let source = document.createElement("source");
      source.src = KeepAwakeByVideo.mp4Src;
      source.type = "video/mp4";
      KeepAwakeByVideo.video.append(source);

      // Add webm source
      source = document.createElement("source");
      source.src = KeepAwakeByVideo.webmSrc;
      source.type = "video/webm";
      KeepAwakeByVideo.video.append(source);

      // Play it as a result of user interaction
      KeepAwakeByVideo.video.play();
    });
  }

  static activate(enable = true) {
    if (!enable) KeepAwakeByVideo.enabled = false;
    else if (!KeepAwakeByVideo.enabled) {
      if (!KeepAwakeByVideo.video) KeepAwakeByVideo.initialize();
      KeepAwakeByVideo.keepAwake();
    }
  }
}

export async function preventDisplayFromSleep(enabled = true, timeout = 0) {
  try {
    if (enabled === !wakelock) {
      if (enabled) {
        const navigatorWakeLock = "wakeLock" in navigator ? navigator["wakeLock"] : null;
        if (navigatorWakeLock) {
          try {
            wakelock = await navigatorWakeLock.request();
            wakelock.addEventListener("release", () => {
              console.log("Screen Wake State Locked:", !(wakelock as WakeLockSentinel).released);
            });
            console.log("Screen Wake State Locked:", !wakelock.released);
          } catch (e) {
            console.error("Failed to lock wake state with reason:", (e as Error).message);
            if (wakelock && wakelock !== true) wakelock.release();
            wakelock = null;
          }
        } else {
          console.log("No wakelock, trying video hack...");
          try {
            KeepAwakeByVideo.activate();
            wakelock = true;
          } catch (error) {
            console.log("Wakelock video hack failed", error);
            requestAnimationFrame(() => {
              document.body.style.background = "black";
            });
            wakelock = null;
          }
        }
      } else {
        if (wakelock && wakelock !== true) wakelock.release();
        KeepAwakeByVideo.activate(false);
        wakelock = null;
      }
    }
    if (enabled && timeout > 0) {
      autoReleaseWakeLockTime = Date.now() + timeout;
      setTimeout(() => {
        if (autoReleaseWakeLockTime <= Date.now()) preventDisplayFromSleep(false);
      }, timeout);
    }
  } catch (error) {
    console.error("Error during apply wakelock", error);
  }
}
