import fs from "fs";
import path from "path";

const mediaDir = path.resolve(process.cwd(), "uploads", "media");
const tmpDir = path.resolve(process.cwd(), "uploads", "tmp");

function check(dir) {
    try {
        if (!fs.existsSync(dir)) {
            console.log(`${dir} does not exist`);
            return;
        }
        fs.accessSync(dir, fs.constants.W_OK);
        console.log(`${dir} is writable`);
    } catch (err) {
        console.error(`${dir} is NOT writable: ${err.message}`);
    }
}

check(mediaDir);
check(tmpDir);
