import { TiMaluumPageLinkCollections } from "../types";

export const IMALUUM_LOGIN_PAGE =
	"https://cas.iium.edu.my:8448/cas/login?service=https%3a%2f%2fimaluum.iium.edu.my%2fhome";

export const IMALUUM_HOME_PAGE = "https://imaluum.iium.edu.my/home";

export const IMALUUM_SUBPAGE_LINKS: TiMaluumPageLinkCollections = {
	RESULT: "https://imaluum.iium.edu.my/MyAcademic/result",
	TIMETABLE: "https://imaluum.iium.edu.my/MyAcademic/schedule",
	TEST: "",
};

export const DUMP_BASE_PATH = "./tmp";

export const CREDENTIALS_FILE_PATH = `${DUMP_BASE_PATH}/credentials.json`;

export const RESULT_TABLE_PATH = `${DUMP_BASE_PATH}/result_table.html`;

export const TIMETABLE_TABLE_PATH = `${DUMP_BASE_PATH}/timetable_table.html`;
