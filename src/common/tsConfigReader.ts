import {fileExists, readJSONFile} from "oc-tools/fs";
import * as path from "path";

export class TsConfigReader {
    constructor() {
    }

    async read(filePaths: string[]): Promise<TsWorkspace> {
        const workspace = new TsWorkspace();

        for(const filePath of filePaths) {
            await this.readSingle(workspace, filePath);
        }

        return workspace;
    }

    private async readSingle(workspace: TsWorkspace, filePath: string): Promise<TsProject> {
        if(workspace.hasProject(filePath)) {
            return workspace.getProject(filePath);
        }

        const config = await readJSONFile(filePath);
        const project = new TsProject(workspace, filePath, config);
        workspace.addProject(project);

        await this.loadReferences(workspace, project);

        return project;
    }

    private async loadReferences(workspace: TsWorkspace, project: TsProject) {
        for(const ref of project.config.references) {
            const refFilePath = path.resolve(project.filePath, ref.path, "tsconfig.json");
            if(!await fileExists(refFilePath)) {
                throw new Error("Referenced " + refFilePath + " was not found")
            }

            const refDoc = await this.readSingle(workspace, refFilePath);
            project.addReference(refDoc);
        }
    }
}

export class TsWorkspace {
    public projects = new Map<string, TsProject>();

    constructor() {
    }

    addProject(project: TsProject) {
        this.projects.set(project.filePath, project);
    }

    hasProject(filePath: string) {
        return this.projects.has(filePath);
    }

    getProject(filePath: string) {
        const proj = this.projects.get(filePath);
        if(!proj) {
            throw new Error("Project " + filePath + " was not found");
        }

        return proj;
    }

    async walk(callback: WalkCallback) {
        for (const project of this.projects.values()) {
            if(project.parent) {
                continue;
            }

            await this.walkProject(project, callback);
        }
    }

    private async walkProject(project: TsProject, callback: WalkCallback) {
        for(const ref of project.references) {
            await this.walkProject(project, callback);
        }

        await callback(project);
    }
}

export type WalkCallback = (project: TsProject) => Promise<void>;

export class TsProject {
    public references: TsProject[] = [];
    public parent: TsProject;

    constructor(public workspace: TsWorkspace, public filePath: string, public config: TsConfig) {
    }

    addReference(ref: TsProject) {
        this.references.push(ref);

        ref.parent = this;
    }
}

export interface TsConfig {
    compilerOptions: TsConfigCompilerOptions;
    references: TsConfigReference[];
}

export interface TsConfigCompilerOptions {
    outDir: string;
}

export interface TsConfigReference {
    path: string;
}
