// Log with deduping (xN) added to the end
let lastLog = "";
let logCount = 0;

const clearLastLine = () => {
  process.stdout.moveCursor(0, -1); // up one line
  process.stdout.clearLine(1); // from cursor to end
};

export const log = (message: string) => {
  if (message === lastLog) {
    logCount++;
  } else {
    lastLog = message;
    logCount = 1;
  }

  if (logCount > 1) {
    // Remove last line from stdout
    clearLastLine();
    console.log(`${message} ${logCount > 1 ? `(x${logCount})` : ""}`);
    return;
  }

  console.log(message);
};
