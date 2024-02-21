import { source } from "common-tags"
import { Plugin } from "vite"

namespace Options {
	export type C = {
		language: "c"
	}

	export type Cpp = {
		language: "c++"

		/**
		 * Style of the top level namespace
		 *
		 * @example `legacy`
		 * ```cpp
		 * namespace top_level { namespace my_file { ... } }
		 * ```
		 *
		 * @example `c++17`
		 * ```cpp
		 * namespace top_level::my_file { ... }
		 * ```
		 */
		topLevelNamespaceStyle: "legacy" | "c++17"

		/**
		 * Use C++11 constexpr
		 */
		constexpr: boolean
	}

	export type General = {
		/**
		 * Top level namespace (can help with namespace collisions)
		 *
		 * @example
		 * Enabled
		 *
		 * C++:
		 * ```cpp
		 * namespace top_level::my_file { ... }
		 * ```
		 *
		 * C:
		 * ```c
		 * const char* top_level_my_file_data[] = ...
		 * ```
		 *
		 * @example Disabled
		 *
		 * C++:
		 * ```cpp
		 * namespace my_file { ... }
		 * ```
		 *
		 * C:
		 * ```c
		 * const char* my_file_data[] = ...
		 * ```
		 */
		topLevelNamespace?: string | undefined

		/**
		 * Function to manually generate the namespace name for a file
		 *
		 * @param fileName The name of the file
		 * @returns The namespace name
		 *
		 * @example
		 * ```ts
		 * (fileName) => fileName.replaceAll(/[^\w\d]+/g, "_")
		 * ```
		 *
		 * For a file named `my_file.html` would generate:
		 *
		 * C++:
		 * ```cpp
		 * namespace my_file_html { ... }
		 * ```
		 *
		 * C:
		 * ```c
		 * const char* my_file_html_data[] = ...
		 * ```
		 */
		namespace: (fileName: string) => string

		/**
		 * List of lines to prepend (eg. `#pragma once`)
		 */
		prepend: string[]

		/**
		 * List of headers to include (eg. `<stdio.h>`)
		 */
		include: string[]

		/**
		 * Type of the `data` variable
		 */
		dataType: string

		/**
		 * Type of the `length` variable
		 */
		lengthType: string

		/**
		 * Extension of the header file
		 */
		headerExtension: `.${string}`

		/**
		 * Filter function to determine whether a file should be transformed
		 *
		 * @param fileName The name of the file
		 * @returns Whether the file should be transformed
		 */
		filter: (fileName: string) => boolean
	}
}

type Options = (Options.C | Options.Cpp) & Options.General

type COptions = Extract<Options, { language: "c" }>
type CppOptions = Extract<Options, { language: "c++" }>

type PartialOptions = Partial<Options>

function resolveOptions(options: PartialOptions): Options {
	const defaultGeneralOptions = {
		prepend: [],
		include: [],
		dataType: "unsigned char",
		lengthType: "unsigned int",
		headerExtension: ".h",
		filter: () => true,
		namespace: (fileName) =>
			fileName
				.replaceAll(/[^\w\d]+/g, "_")
				.replace(/^\d/, "_$0")
				.toLowerCase(),
	} satisfies Options.General

	switch (options.language) {
		case "c":
			return {
				...defaultGeneralOptions,
				...options,
			}
		case "c++":
			return {
				...defaultGeneralOptions,
				topLevelNamespaceStyle: "c++17",
				constexpr: true,
				...options,
			}
		default:
			return {
				...defaultGeneralOptions,
				...options,
				language: "c",
			}
	}
}

function encodeSource(source: string | Uint8Array): Uint8Array {
	if (typeof source === "string") {
		return new TextEncoder().encode(source)
	}

	return source
}

function renderData(data: Uint8Array) {
	return `{${data.join(",")}}`
}

function renderCEmbed(options: COptions, fileName: string, data: Uint8Array) {
	const topLevelNamespace = options.topLevelNamespace
		? `${options.topLevelNamespace}_`
		: ""

	const namespace = `${topLevelNamespace}${options.namespace(fileName)}`

	return source`
		const ${options.dataType} ${namespace}_data[] = ${renderData(data)};
		const ${options.lengthType} ${namespace}_length = ${data.length};
	`
}

function renderCppNamespace(namespace: string, content: string) {
	return source`
		namespace ${namespace} {
		${content}
		}
	`
}

function renderCppEmbed(
	options: CppOptions,
	fileName: string,
	data: Uint8Array,
) {
	const constexpr = options.constexpr ? "constexpr " : ""

	let render = source`
		${constexpr}const ${options.dataType} data[] = ${renderData(data)};
		${constexpr}const ${options.lengthType} length = ${data.length};
	`

	const fileNamespace = options.namespace(fileName)

	if (options.topLevelNamespace) {
		if (options.topLevelNamespaceStyle === "c++17") {
			const namespace = `${options.topLevelNamespace}::${fileNamespace}`

			render = renderCppNamespace(namespace, render)
		} else {
			render = renderCppNamespace(
				options.topLevelNamespace,
				renderCppNamespace(fileNamespace, render),
			)
		}
	} else {
		render = renderCppNamespace(fileNamespace, render)
	}

	return render
}

function renderFile(options: Options, fileName: string, data: Uint8Array) {
	let render

	switch (options.language) {
		case "c":
			render = renderCEmbed(options, fileName, data)
			break
		case "c++":
			render = renderCppEmbed(options, fileName, data)
			break
	}

	const header = [
		...options.prepend,
		...options.include.map((header) => `#include ${header}`),
	].join("\n")

	return source`
		${header}
		${render}
	`
}

export function embeddableCCppHeaders(
	partialOptions: PartialOptions = {},
): Plugin {
	const options = resolveOptions(partialOptions)

	return {
		name: "vite:embeddable-c-cpp-headers",
		enforce: "post",
		generateBundle(_options, bundle, isWrite) {
			if (!isWrite) {
				return
			}

			for (const file of Object.values(bundle)) {
				if (!options.filter(file.fileName)) {
					continue
				}

				const outputFileName = `${file.fileName}${options.headerExtension}`

				const data = encodeSource(
					file.type === "asset" ? file.source : file.code,
				)

				const source = renderFile(options, file.fileName, data)

				this.emitFile({
					type: "asset",
					fileName: outputFileName,
					source,
				})
			}
		},
	}
}
