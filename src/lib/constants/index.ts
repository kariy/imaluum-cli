import os from "node:os";
import path from "node:path";

import { TiMaluumSubpageLinkCollections } from "../types";

export const IMALUUM_LOGIN_PAGE =
	"https://cas.iium.edu.my:8448/cas/login?service=https%3a%2f%2fimaluum.iium.edu.my%2fhome";

export const IMALUUM_HOME_PAGE = "https://imaluum.iium.edu.my/home";

export const IMALUUM_SUBPAGE_LINKS: TiMaluumSubpageLinkCollections = {
	RESULT: "https://imaluum.iium.edu.my/MyAcademic/result",
	TIMETABLE: "https://imaluum.iium.edu.my/MyAcademic/schedule",
};

const tmpDir = os.tmpdir();

export const DUMP_BASE_PATH = path.join(tmpDir, "imaluum-cli");

export const CREDENTIALS_FILE_PATH = path.join(DUMP_BASE_PATH, "credentials.txt");

export const RESULT_TABLE_PATH = path.join(DUMP_BASE_PATH, "result_table.html");

export const TIMETABLE_TABLE_PATH = path.join(DUMP_BASE_PATH, "timetable_table.html");

export const COOKIE_FILE_PATH = path.join(DUMP_BASE_PATH, "cookie.json");
