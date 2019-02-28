import {AppConfig} from "./dtos";
import {spawn} from "child_process";

export async function runApps(apps: AppConfig[]) {
    for(const app of apps) {
        spawn("node", [app.main], {
            stdio: "inherit",
            cwd: app.cwd,
        });
    }
}
