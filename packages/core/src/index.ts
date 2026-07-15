/** Domain logic shared by web + worker. Never imports React (§3). */
export const CORE_VERSION = "0.0.0" as const;

export * as validation from "./validation/index";
export * as content from "./content/index";
