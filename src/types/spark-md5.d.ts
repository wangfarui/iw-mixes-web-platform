declare module 'spark-md5' {
  interface SparkMd5Module {
    hash(input: string, raw?: boolean): string
    ArrayBuffer: {
      hash(input: ArrayBuffer, raw?: boolean): string
    }
  }

  const SparkMD5: SparkMd5Module
  export default SparkMD5
}
