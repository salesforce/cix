import stream from 'stream';

/**
 * @class ContainerStreamTransform
 * @description Converts container output to a winston object stream.
 */
export default class ContainerStreamTransform extends stream.Transform {
  constructor(environment, containerNames, isErrorOutput) {
    super({
      readableObjectMode: true,
      writableObjectMode: true,
    });
    this.environment = environment;
    this.containerNames = containerNames;
    this.isErrorOutput = isErrorOutput;
    this.previousIncompleteChunk = '';
  }

  _transform(chunk, _encoding, callback) {
    let message;
    if (this.environment) {
      message = this.previousIncompleteChunk + this.environment.redactSecrets(chunk.toString());
    } else {
      message = this.previousIncompleteChunk + chunk.toString();
    }

    if (!message.includes('\n')) {
      this.previousIncompleteChunk = message;
    } else {
      this.previousIncompleteChunk = '';
      this.push({
        level: 'info',
        message: Buffer.from(message.trimEnd()),
        containerNames: this.containerNames,
        isErrorOutput: this.isErrorOutput,
      });
    }
    callback();
  }

  _final() {
    if (this.previousIncompleteChunk != '') {
      this.push({
        level: 'info',
        message: Buffer.from(this.previousIncompleteChunk.trimEnd()),
        containerNames: this.containerNames,
        isErrorOutput: this.isErrorOutput,
      });
    }
  }
}
