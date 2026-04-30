import {Video} from './Video';

export class Source {
  sources: Src[] | undefined;
  poster: string | undefined;
  video: Video | undefined;
}

export class Src {
  src: string | undefined;
  type: string | undefined;
}
