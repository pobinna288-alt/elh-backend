declare const _default: (() => {
    uploadDir: string;
    maxFileSize: number;
    allowedVideoMimeTypes: string[];
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    uploadDir: string;
    maxFileSize: number;
    allowedVideoMimeTypes: string[];
}>;
export default _default;
export declare const multerConfig: {
    storage: import("multer").StorageEngine;
    limits: {
        fileSize: number;
    };
    fileFilter: (req: any, file: any, cb: any) => void;
};
