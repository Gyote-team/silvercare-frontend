// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VoiceRecorder } from "./VoiceRecorder";
import type { VoiceJob } from "@/lib/voice";
import { ApiRequestError } from "@/lib/api";
const mocks=vi.hoisted(()=>({api:vi.fn(),detail:vi.fn(),upload:vi.fn()}));
vi.mock("@/lib/api",async (original)=>({...await original<typeof import("@/lib/api")>(),api:mocks.api}));
vi.mock("@/lib/voice",async (original)=>({...await original<typeof import("@/lib/voice")>(),voiceDetail:mocks.detail,uploadVoice:mocks.upload}));
const draft:VoiceJob={transcriptionId:"job-1",patientId:"patient-1",visitId:null,purpose:"HEALTH_RECORD",status:"DRAFT_READY",statusUrl:"/api/transcriptions/job-1",draftText:"잘못 인식된 초안",errorCode:null,recordId:null,confirmedText:null,version:7,createdAt:"2026-10-27T00:00:00Z"};
beforeEach(()=>{mocks.api.mockResolvedValue([]);});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();Reflect.deleteProperty(navigator,"mediaDevices");});
describe("음성 초안 확인",()=>{
  it("다른 창에서 확정되어 409가 오면 다시 불러오기 전 저장을 차단한다",async()=>{
    mocks.api.mockResolvedValueOnce([draft]).mockRejectedValueOnce(new ApiRequestError(409,"conflict"));
    render(<VoiceRecorder onSaved={vi.fn()}/>);
    fireEvent.click(await screen.findByRole("button",{name:/내용 확인 필요/}));
    fireEvent.click(screen.getByRole("button",{name:"확인한 내용 기록하기"}));
    await screen.findByRole("alert");
    expect((screen.getByRole("button",{name:"확인한 내용 기록하기"}) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button",{name:"음성 상태 다시 불러오기"}) as HTMLButtonElement).disabled).toBe(false);
  });
  it("녹음 중 화면이 닫히면 녹음과 마이크 트랙을 정리한다",async()=>{
    const stopTrack=vi.fn();
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:vi.fn(async()=>({getTracks:()=>[{stop:stopTrack}]}))}});
    const stopRecorder=vi.fn();
    vi.stubGlobal("MediaRecorder",class {
      static isTypeSupported(){return true;}
      state="inactive";mimeType="audio/webm";onstop:(()=>void)|null=null;
      start(){this.state="recording";}
      stop(){stopRecorder();this.state="inactive";this.onstop?.();}
    });
    const view=render(<VoiceRecorder onSaved={vi.fn()}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:/녹음 시작/}));
    await screen.findByRole("button",{name:/녹음 마치기/});
    view.unmount();
    expect(stopRecorder).toHaveBeenCalled();expect(stopTrack).toHaveBeenCalled();
  });
  it("마이크를 지원하지 않으면 파일 선택을 안내한다",async()=>{
    render(<VoiceRecorder onSaved={vi.fn()}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:/녹음 시작/}));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent",expect.stringContaining("음성 파일을 선택"));
  });
  it("초안은 자동 저장하지 않고 수정한 본문과 조회 버전을 확정 요청에 전송한다",async()=>{
    const saved=vi.fn();mocks.api.mockResolvedValueOnce([draft]).mockResolvedValueOnce({...draft,status:"CONFIRMED",recordId:"record-1",confirmedText:"고친 내용"}).mockResolvedValue([]);
    render(<VoiceRecorder patientId="patient-1" onSaved={saved}/>);
    fireEvent.click(await screen.findByRole("button",{name:/내용 확인 필요/}));
    expect(saved).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("변환된 내용 확인·수정"),{target:{value:"고친 내용"}});
    fireEvent.click(screen.getByRole("button",{name:"확인한 내용 기록하기"}));
    await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
    expect(mocks.api).toHaveBeenCalledWith("/api/transcriptions/job-1/confirm",{method:"POST",body:JSON.stringify({body:"고친 내용",version:7})});
  });
  it("취소된 방문은 녹음·초안 확정 없이 기존 음성을 조회할 수 있다",async()=>{
    mocks.api.mockResolvedValue([{...draft,visitId:"visit-1"}]);
    render(<VoiceRecorder visitId="visit-1" readOnly onSaved={vi.fn()}/>);
    expect(screen.queryByRole("button",{name:/녹음 시작/})).toBeNull();
    fireEvent.click(await screen.findByRole("button",{name:/내용 확인 필요/}));
    expect((screen.getByRole("button",{name:"확인한 내용 기록하기"}) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.api).toHaveBeenCalledWith("/api/visits/visit-1/recordings",expect.anything());
  });
  it("긴 초안을 자르지 않고 전부 보여주며 2000자 초과 저장은 차단한다",async()=>{
    mocks.api.mockResolvedValue([{...draft,draftText:"가".repeat(2001)}]);
    render(<VoiceRecorder onSaved={vi.fn()}/>);
    fireEvent.click(await screen.findByRole("button",{name:/내용 확인 필요/}));
    expect((screen.getByLabelText("변환된 내용 확인·수정") as HTMLTextAreaElement).value).toHaveLength(2001);
    expect((screen.getByRole("button",{name:"확인한 내용 기록하기"}) as HTMLButtonElement).disabled).toBe(true);
  });
  it("업로드 응답이 끊겨 다시 보내도 같은 파일과 요청 키를 유지한다",async()=>{
    mocks.upload.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({...draft,status:"UPLOADED",draftText:null});
    render(<VoiceRecorder patientId="patient-1" onSaved={vi.fn()}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    const file=new File(["test audio"],"test.wav",{type:"audio/wav"});
    fireEvent.change(screen.getByLabelText(/또는 음성 파일 선택/),{target:{files:[file]}});
    fireEvent.click(screen.getByRole("button",{name:"음성을 글로 바꾸기"}));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button",{name:"음성을 글로 바꾸기"}));
    await waitFor(()=>expect(mocks.upload).toHaveBeenCalledTimes(2));
    expect(mocks.upload.mock.calls[0].slice(0,5)).toEqual(mocks.upload.mock.calls[1].slice(0,5));
  });
});
