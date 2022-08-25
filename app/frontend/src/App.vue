<template>
  <AppConversation ref="appConversation"/>
</template>

<script lang="ts">
import {defineComponent} from "vue";
import AppConversation from "@/AppConversation.vue";

export default defineComponent({
  name: "App",
  components: {AppConversation},
});

</script>

<style>

</style>