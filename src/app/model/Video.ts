export class Video {
  ageStart: number | undefined;
  ageEnd: number | undefined;
  createDate: Date | undefined;
  equipment: boolean | undefined;
  name: string | undefined;
  videoName: string | undefined;
  id: string | undefined;
  videoDuration: number | undefined;
  watchedTime: number | undefined;
  difficulty: string | undefined;
  category: string | undefined;
  equipmentDetail: string | undefined;
  videolink: string | undefined;
  categoryDetail: string | undefined;
  imagelink: string | undefined;


  constructor(
    ageStart?: number, ageEnd?: number, createDate?: Date, equipment?: boolean, name?: string,
    videoName?: string, id?: string, videoDuration?: number, watchedTime?: number, difficulty?: string,
    category?: string, equipmentDetail?: string, videolink?: string, categoryDetail?: string, imagelink?: string
  ) {
    this.ageStart = ageStart;
    this.ageEnd = ageEnd;
    this.createDate = createDate;
    this.equipment = equipment;
    this.name = name;
    this.videoName = videoName;
    this.id = id;
    this.videoDuration = videoDuration;
    this.watchedTime = watchedTime;
    this.difficulty = difficulty;
    this.category = category;
    this.equipmentDetail = equipmentDetail ?? '';
    this.videolink = videolink ?? '';
    this.categoryDetail = categoryDetail ?? '';
    this.imagelink = imagelink ?? '';
  }
}
