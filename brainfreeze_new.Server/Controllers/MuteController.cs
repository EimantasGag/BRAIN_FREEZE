using Microsoft.AspNetCore.Mvc;

namespace brainfreeze_new.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MuteController : ControllerBase
    {
        private static bool _isMuted = false;

        [HttpPost]
        public IActionResult SetMuteState([FromBody] MuteState muteState)
        {
            Console.WriteLine($"Received mute state: {muteState.IsMuted}");
            _isMuted = muteState.IsMuted;
            return Ok(new { message = "Mute state updated" });
        }

        [HttpGet]
        public IActionResult GetMuteState()
        {
            return Ok(new { isMuted = _isMuted });
        }
    }

    public class MuteState
    {
        public bool IsMuted { get; set; }
    }
}
