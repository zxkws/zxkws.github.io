<script setup lang="ts">
import { uploadFile } from "@/http";

const files = ref<any>([]);
const handleFile = (e: any) => {
  files.value = [...e.target.files];
};
const handleUpload = () => {
  if (files.value.length) {
    const formData = new FormData();
    files.value.forEach((file) => {
      console.log(file);
      formData.set(file.name, file);
    });
    uploadFile(formData).then((res) => {
      console.log(res);
    });
  }
};

</script>
<template>
  <div>
    <input type="file" multiple @change="handleFile" />
    <button @click="handleUpload">上传</button>
  </div>
</template>
